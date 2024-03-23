import {
  Button,
  FarcasterUserDetailsInput,
  FarcasterUserDetailsOutput,
  Frog,
  getFarcasterUserDetails
} from "@airstack/frog";
import crypto from 'crypto';
import { config } from "dotenv";
import { devtools } from 'frog/dev';
import { serveStatic } from 'frog/serve-static';
import fs from 'fs';
import OpenAI from 'openai';
import sharp from 'sharp';
const openAi = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'], // This is the default and can be omitted
});

config();

// Instantiate new Frog instance with Airstack API key
export const app = new Frog({
  apiKey: process.env.AIRSTACK_API_KEY as string,
});

const convertJpegToPng = async (url: string) => {
  // For some reason, airstack store images as jpeg, so we need to convert it to png
  const response = await fetch(url);
  console.log(`Response status: ${response.status}`)
  if (!response.ok)
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  // create md5 of filename using crypto
  const md5 = crypto.createHash('md5').update(url).digest('hex');
  const outputPath = `/tmp/${md5}.png`;
  const arrayBuffer = await response.arrayBuffer();
  const jpegBuffer = Buffer.from(arrayBuffer);
  console.log(`Buffer length: ${jpegBuffer.length}`);

  const pngBuffer = await sharp(jpegBuffer).toColourspace('srgb').ensureAlpha().toBuffer();
  console.log(`PNG buffer length: ${pngBuffer.length}`);
  fs.writeFileSync(outputPath, pngBuffer);
  // Save the PNG buffer to a file

  return fs.createReadStream(outputPath);
}

app.frame("/", async (c) => {
  const { status } = c;
  const input: FarcasterUserDetailsInput = {
    fid: 602,
  };
  const { data, error }: FarcasterUserDetailsOutput =
    await getFarcasterUserDetails(input);

  // We need to download the image from the URL above and send it to OpenAI
  // Either via a stream or a buffer
  const url = data?.profileImage?.original
  console.log(url)
  if (!url) throw new Error('No image found');

  // Stream the image from the URL into a buffer
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch image');
  const stream = await convertJpegToPng(url);
  // console.log(`The Stream: ${stream}`)
  // const uploadResponse = await openAi.files.create({
  //   purpose: "fine-tune",
  //   file: stream,
  // });
  // const imageId = uploadResponse.id

  const variant = await openAi.images.edit({
    prompt: "Turn this image into The Simpsons theme and colors, ensure its true to the simpsons universe and style",
    image: './scarlett-johansson.png',
    n: 1,
    model: "dall-e-2",
    size: "256x256",
    response_format: "url"
  })
  console.log(variant)

  if (error) throw new Error(error);

  console.log(data, 'farcaster user details');
  return c.res({
    image: (
      <div
        style={{
          color: "green",
          display: "flex",
          fontSize: 40,
        }}
      >
        {status === "initial" ? "Initial Frame" : "Response Frame"}
      </div>
    ),
    intents: [status === "initial" && <Button>Click Here</Button>],
  });
});

devtools(app, { serveStatic })
