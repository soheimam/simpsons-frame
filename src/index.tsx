import {
  Button,
  Frog,
  getFarcasterUserDetails,
} from "@airstack/frog";
import { config } from "dotenv";
import { devtools } from 'frog/dev';
import { serveStatic } from 'frog/serve-static';
import { OpenAI, } from 'openai';
import { POST } from "./post.js";
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
            type: "text",
            text: "Based on the image, provide a detailed character description suitable for creating a chibi-style anime illustration. " +
              "Note the [gender], [hair color], and [hair style], [eye color], and any notable expressions or emotions conveyed. " +
              "Highlight key features that should be exaggerated in a chibi rendition, like eye size or head shape. " +
              "Describe the clothing style and any distinctive accessories, ensuring they can be adapted to a cute, simplified anime form. " +
              "Suggest a single color background that matches the overall tone of the photo, be it warm, fun, or colorful, " +
              "and ensures the single chibi character will be the focal point with a friendly and engaging expression."
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
    const Originalprompt =
      `Create a single chibi-style close up portrait of an anime character,The character should have a clean and modern anime-inspired aesthetic, ` +
      `based on the following description: ${_prompt}.` +
      `The character should have hair and eye colors that match the description provided. ` +
      `Dress them in clothing and accessories as described. ` +
      `Design the character with typical chibi characteristics: a disproportionately larger head and eyes, and a smaller body. ` +
      `Set against a solid pastel coloured background, only one character should be in the illustration ` +
      `The character should be facing the viewer with a welcoming and warm expression,The style should be clean, bright, and reminiscent of high-quality digital anime illustrations.`;


    const prompt = `DO NOT add any detail, just use it AS-IS: ${Originalprompt}`;

    // Use the image stream directly for the OpenAI call
    const openAiResponse = await openAi.images.generate({
      // image: imageStream,
      model: "dall-e-3",
      response_format: 'b64_json',
      style: "vivid",
      size: "1024x1024",
      prompt: prompt,
    });

    console.log(openAiResponse.data[0], 'OpenAI Response');

    return openAiResponse.data[0].b64_json;
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

  const res = {
    base64: output as string,
    traits: [{ trait_type: "cute", value: "true" }],
    tokenId: "1",
    visibility: "PUBLIC",
    projectId: "0d53e5b6-5403-4e4c-ac50-ed091dc4db4a"
  }

  const metafuseReq = await POST(res);
  console.log(metafuseReq);

  const updatedImage = `https://api.metafuse.me/${metafuseReq?.key}`

  return c.res({
    image: updatedImage,
    intents: [status === "initial" && <Button>Click Here</Button>],
  });
});

devtools(app, {
  appFid: 15850,
  serveStatic
})
