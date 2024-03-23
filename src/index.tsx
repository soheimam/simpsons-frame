import {
  Button,
  Frog,
  getFarcasterUserDetails,
} from "@airstack/frog";
import { config } from "dotenv";
import { devtools } from 'frog/dev';
import { serveStatic } from 'frog/serve-static';
import { OpenAI, } from 'openai';
const openAi = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'], // This is the default and can be omitted
});

config();

// Instantiate new Frog instance with Airstack API key
export const app = new Frog({
  apiKey: process.env.AIRSTACK_API_KEY as string,
});

//extract labels
const extractLabelsFromImage = async (imageUrl: string) => {
  const response = await openAi.chat.completions.create({
    model: "gpt-4-vision-preview",
    messages: [
      {
        role: "user",

        content: [
          {
            type: "text", text: "Based on the image, generate a description of a person with the following format: " +
              "age [years old], sex [male/female/other], with: a [face size] face, a [nose size] nose, " +
              "[eyes color] eyes, [hair color] [hair style] hair, [mouth size] mouth, [stature], [body size]. " +
              "Describe the background as [background]. Keep the description no more than 700 chars."
          },
          {
            type: "image_url",
            image_url: {
              "url": imageUrl,
            },
          },
        ],
      },
    ],
  });

  return response.choices?.[0].message.content;
}
//convert and edit image
async function convertAndEditImage(_prompt: string) {
  try {
    const Originalprompt = `Create a single chibi-style character, centered in the composition, from the photo provided. The image should be a close-up, front shot where the character looks directly at the viewer with large, expressive eyes and a wide, happy smile. Focus on making the head and shoulders prominent, embodying the charm of chibi art. Use a plain, colorful background that complements the character without any other figures, text, or distractions. The overall effect should be playful and endearing, highlighting the character's joyful persona." ${_prompt} `

    const prompt = `DO NOT add any detail, just use it AS-IS: ${Originalprompt}`;

    // Use the image stream directly for the OpenAI call
    const openAiResponse = await openAi.images.generate({
      // image: imageStream,
      model: "dall-e-3",
      response_format: 'url',
      style: "vivid",
      size: "1024x1024",
      prompt: prompt,
    });

    console.log(openAiResponse, 'OpenAI Response');
    return openAiResponse.data[0].url
  } catch (error) {
    console.error('Error:', error);
  }
}

app.frame('/', (c) => {
  return c.res({
    action: '/submit',
    image: (
      <div style={{ color: 'white', display: 'flex', fontSize: 60 }}>
        Click to cuteify your image
      </div>
    ),
    intents: [
      <Button value="start">Start</Button>,
    ]
  })
})


app.frame("/submit", async (c) => {
  const { status } = c;
  console.log(c, 'status');
  const input = {
    fid: c.frameData?.fid || 1
  };

  const { data, error } = await getFarcasterUserDetails(input);
  if (error) {
    console.error(error);
    // Since we're avoiding try/catch, make sure to handle the error appropriately here.
    return;
  }

  if (!data?.profileImage?.original) {
    return
  }
  const labels = await extractLabelsFromImage(data?.profileImage?.original);
  if (!labels) {
    return;
  }
  const output = await convertAndEditImage(labels);
  console.log(output);

  return c.res({
    image: output as string,
    intents: [status === "initial" && <Button>Click Here</Button>],
  });
});

devtools(app, { serveStatic })
