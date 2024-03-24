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
            text: "Based on the image, provide a description suitable for creating a character illustration. " +
              "Detail the [hair color] and [hair style], [eye color], and describe any notable clothing " +
              "or accessories in a cute anime style. Keep the description brief and focused on these features."
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
    const Originalprompt = `Create a stylized anime character illustration that reflects the [gender] identified from the photo.  ` +
      `with a modern anime aesthetic, featuring the hairstyle described, ` +
      `large expressive [eye color] eyes, and matching [hair color] hair. ` +
      `centrally positioned as the focal point of the image. ` +
      `They should have a cute, welcoming expression with a slight smile and eyes looking directly at the viewer. ` +
      `Their outfit and accessories should reflect a cute anime style derived from the description. ` +
      `The character's pose should be relaxed and inviting, with soft, approachable body language.`;
    `${_prompt}`

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
