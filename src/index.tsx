import {
  Button,
  FarcasterUserDetailsInput,
  FarcasterUserDetailsOutput,
  Frog,
  getFarcasterUserDetails
} from "@airstack/frog";
import { config } from "dotenv";
import { devtools } from 'frog/dev';
import { serveStatic } from 'frog/serve-static';

config();

// Instantiate new Frog instance with Airstack API key
export const app = new Frog({
  apiKey: process.env.AIRSTACK_API_KEY as string,
});

app.frame("/", async (c) => {
  const { status } = c;
  const input: FarcasterUserDetailsInput = {
    fid: 602,
  };
  const { data, error }: FarcasterUserDetailsOutput =
    await getFarcasterUserDetails(input);

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
