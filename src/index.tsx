import {
  Button,
  FarcasterChannelActionType,
  FarcasterChannelParticipantsOutputData,
  Frog,
  getFarcasterUserDetails,
  parseEther
} from "@airstack/frog";
import { config } from "dotenv";
import { devtools } from 'frog/dev';
import { serveStatic } from 'frog/serve-static';
import { OpenAI, } from 'openai';
import { POST } from "./createDigitalAsset.js";
import { GET } from "./getNextTokenId.js";

import {
  FarcasterChannelParticipantsInput,
  FarcasterChannelParticipantsOutput,
  getFarcasterChannelParticipants
} from "@airstack/frog";
import { neynar } from 'frog/hubs';



const openAi = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'], // This is the default and can be omitted
});

config();

// Instantiate new Frog instance with Airstack API key
export const app = new Frog({
  apiKey: process.env.AIRSTACK_API_KEY as string,
  hub: neynar({ apiKey: 'NEYNAR_FROG_FM' })
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
            text:
              `Based on the image, provide a detailed character description suitable for creating a chibi-style anime illustration., 
              Describe the gender, hair color, and hair style, eye color, and any notable expressions or emotions conveyed,
              the clothing style and any distinctive accessories, ensuring they can be adapted to a cute, simplified anime form. 
              Suggest a background that matches the overall tone of the photo, be it warm, fun, or colorful, 
              and ensures the character will be the focal point with a friendly and engaging expression.`
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
      `Create a single chibi-style close up portrait of a single  anime character, 
      based on the following description: ${_prompt}. The character should have hair and eye colors that match the description provided. 
      Dress them in clothing and accessories as described. 
      The character has typical chibi characteristics: a disproportionately larger head and eyes, and a smaller body. 
      The character should be facing the viewer with a welcoming and warm expression,The style should be clean, bright, and reminiscent of high-quality digital anime illustrations.`;


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



    return openAiResponse.data[0].b64_json;
  } catch (error) {
    console.error('Error:', error);
  }
}

// Function to check channel membership
const isUserInChannel = async (fid: string, data: FarcasterChannelParticipantsOutputData[]) => {
  return data.find((user) => user.fid === fid);
};

const isAllowed = async (targetUserFid: number, channelName: string) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const input: FarcasterChannelParticipantsInput = {
    channel: channelName,
    actionType: [
      FarcasterChannelActionType.Cast
    ],
    lastActionTimestamp: {
      after: sevenDaysAgo.toISOString(),
      before: new Date().toISOString()
    },
    limit: 200,
  };
  const { data, error }: FarcasterChannelParticipantsOutput = await getFarcasterChannelParticipants(input);
  if (data) {
    return Boolean(isUserInChannel(String(targetUserFid), data) || false)
  }
}

app.frame('/', async (c) => {
  console.log(c)
  const { status, frameData } = c;

  // Assume frameData contains the fid (Farcaster ID) of the user
  const fid = frameData?.fid || 1
  if (!fid) {
    console.log('No FID found', frameData)
    return;
  }

  const isInTheTargetChannel = await isAllowed(fid, "thesimpsons");
  return c.res({
    action: isInTheTargetChannel ? '/submit' : '/not-allowed',
    image: (
      <div style={{
        display: 'flex',
        height: '100%',
        width: '100%',
        backgroundImage: 'url("https://portalapistack-uploadbucket5b1e560c-1uw248zf0758m.s3.us-east-2.amazonaws.com/protected/us-east-2%3A52bd2aac-245a-45e7-87ad-c3b3f59431f6/0d53e5b6-5403-4e4c-ac50-ed091dc4db4a/7fa091ad-214e-420c-9392-818ffb79a0ac.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAR3QXGJWVBM5V4AOG%2F20240324%2Fus-east-2%2Fs3%2Faws4_request&X-Amz-Date=20240324T163116Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEGAaCXVzLWVhc3QtMiJIMEYCIQC6FIu%2B2r7elCKQa3eDzAbQa%2BzmJMe8LIy29JhFh1N4XwIhAIn2v0JhKVmOtafcXSgV9%2FndLVY%2FoKGMGo0s6wcj4au1KsQECHoQARoMMTI3ODIzOTI0NjUwIgx3rkoqGgYT%2BzJdvuMqoQTeF17uKlYf%2BtPkUKqRE87ZTQ%2BMCGmP51swuaVOQvkicRbbHwqLer3xJGlydU6fZhzXOG3HyX9vdVGeHlCSnbnrKF3RjCgHaA%2B%2BqtdvOD3bGSU1xev%2Fp5nxZBb0RGjNr42Eur6uitqoi0rEHJqn2ItrUgkQrcosOnCwk0JvK%2FzAHnAy%2FmKYzbAPnROU%2B%2FQZXSaZe%2FxXFqGj9iPzcYQ1%2B0O1Xqukan1fKoi3c2I3OXBzUeoXdlmJ5Ez35iJcaM0D8nE5k0yh0GCmaYB8YJj4rDlCBrwy1WS0JE1JlLUjd%2FUm%2B6kFJ3SNMCKTj5%2BNIhtKaOQygWghCT5VHD0VMDDxDGmMSsGuIL4wf2R%2FOqb8AzKp2lyu%2BBet2WSfkZBiuJg4kb81xfP6YeErNf3RhIgHSAeGjTtmSfvS9AGQo%2B6VV0d2xEaTibsFuqx%2FHsYdR7nW3F%2FNdFCvMEqc4fZT12iEHqjpITUkFa9cB0SrtmdkbIsyehHSd7g14U7j7jbPBr81tEgSLeYaDrehrZozb03Dt8W0S2x3PAySRJE5967MRbfwst4ZrImoyjh0NAurx50jY8YQDmQ5CiwDa5vml%2BJzyabsD2PTGLcqhYfRUTYr0nAtfc3MexYNTNjP2WmDJkOFLKVN%2BdgBFhaqr6BstzvyW6qvJlayl1fqk8HTn%2FUmnhNfC%2BPcEYUNpipKWijPtfVljecciB0mTY1u6wc4zfulq%2FmR4TCXp4GwBjqEAtyTvtceE4Lb%2FWvZZHIKVTJvZX5%2BZrO4TQQxaOhp9CXu9zd%2FC5iSf9vaTyhNhsaUr2IA9YakI2bj3gSxxKSu5zZ1IagtbwEV0b2gGcuTmQwArAg3iW4S8peFIFyLfxSIYbbRaFERs0bvQFzE72SkuNYBZkWiob3iaF%2Fi8blmkCMhy8Bf%2FtxOkj4lA4g6kTG%2F4wb6GMA5VGcX99zE74JEyvBK4QCeiqSQX5vLZdoYCtKo9y7nQIbX9s07WmYoS4zF11Mw5%2F0VO8TSn6Z3wBMr0tu7FIpRUF%2BPUHA26fA7mLNVwZzX0VsdeUhcbYN7CkjpGupG%2BlhcpZAPZgjRLEvRepwzKQk4&X-Amz-Signature=08868fa91baea64b250bf7c59088034549f1539f934ae1a0751789d0eb0c47cc&X-Amz-SignedHeaders=host&x-id=GetObject")'
      }}>

      </div>
    ),
    intents: [
      <Button value="start">Chibi me</Button>,
    ]
  })
})
app.frame("/not-allowed", async (c) => {
  const { status } = c;
  console.log(c, 'status');

  return c.res({
    image: (
      <div style={{
        display: 'flex',
        height: '100%',
        width: '100%',
        backgroundImage: 'url(https://portalapistack-uploadbucket5b1e560c-1uw248zf0758m.s3.us-east-2.amazonaws.com/protected/us-east-2%3A52bd2aac-245a-45e7-87ad-c3b3f59431f6/0d53e5b6-5403-4e4c-ac50-ed091dc4db4a/5a96dc3d-b799-423f-8475-8ae767dfd8b5.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAR3QXGJWVBM5V4AOG%2F20240324%2Fus-east-2%2Fs3%2Faws4_request&X-Amz-Date=20240324T163130Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEGAaCXVzLWVhc3QtMiJIMEYCIQC6FIu%2B2r7elCKQa3eDzAbQa%2BzmJMe8LIy29JhFh1N4XwIhAIn2v0JhKVmOtafcXSgV9%2FndLVY%2FoKGMGo0s6wcj4au1KsQECHoQARoMMTI3ODIzOTI0NjUwIgx3rkoqGgYT%2BzJdvuMqoQTeF17uKlYf%2BtPkUKqRE87ZTQ%2BMCGmP51swuaVOQvkicRbbHwqLer3xJGlydU6fZhzXOG3HyX9vdVGeHlCSnbnrKF3RjCgHaA%2B%2BqtdvOD3bGSU1xev%2Fp5nxZBb0RGjNr42Eur6uitqoi0rEHJqn2ItrUgkQrcosOnCwk0JvK%2FzAHnAy%2FmKYzbAPnROU%2B%2FQZXSaZe%2FxXFqGj9iPzcYQ1%2B0O1Xqukan1fKoi3c2I3OXBzUeoXdlmJ5Ez35iJcaM0D8nE5k0yh0GCmaYB8YJj4rDlCBrwy1WS0JE1JlLUjd%2FUm%2B6kFJ3SNMCKTj5%2BNIhtKaOQygWghCT5VHD0VMDDxDGmMSsGuIL4wf2R%2FOqb8AzKp2lyu%2BBet2WSfkZBiuJg4kb81xfP6YeErNf3RhIgHSAeGjTtmSfvS9AGQo%2B6VV0d2xEaTibsFuqx%2FHsYdR7nW3F%2FNdFCvMEqc4fZT12iEHqjpITUkFa9cB0SrtmdkbIsyehHSd7g14U7j7jbPBr81tEgSLeYaDrehrZozb03Dt8W0S2x3PAySRJE5967MRbfwst4ZrImoyjh0NAurx50jY8YQDmQ5CiwDa5vml%2BJzyabsD2PTGLcqhYfRUTYr0nAtfc3MexYNTNjP2WmDJkOFLKVN%2BdgBFhaqr6BstzvyW6qvJlayl1fqk8HTn%2FUmnhNfC%2BPcEYUNpipKWijPtfVljecciB0mTY1u6wc4zfulq%2FmR4TCXp4GwBjqEAtyTvtceE4Lb%2FWvZZHIKVTJvZX5%2BZrO4TQQxaOhp9CXu9zd%2FC5iSf9vaTyhNhsaUr2IA9YakI2bj3gSxxKSu5zZ1IagtbwEV0b2gGcuTmQwArAg3iW4S8peFIFyLfxSIYbbRaFERs0bvQFzE72SkuNYBZkWiob3iaF%2Fi8blmkCMhy8Bf%2FtxOkj4lA4g6kTG%2F4wb6GMA5VGcX99zE74JEyvBK4QCeiqSQX5vLZdoYCtKo9y7nQIbX9s07WmYoS4zF11Mw5%2F0VO8TSn6Z3wBMr0tu7FIpRUF%2BPUHA26fA7mLNVwZzX0VsdeUhcbYN7CkjpGupG%2BlhcpZAPZgjRLEvRepwzKQk4&X-Amz-Signature=a3892397568fe081a87517572581a777f744f961c3910ec58cd2feb79017c6a1&X-Amz-SignedHeaders=host&x-id=GetObject)'
      }}>

      </div>
    ),
    intents: [status === "initial" && <Button>Click Here ?</Button>],
  });
});

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

  const nextTokenId = await GET({ projectId: "0d53e5b6-5403-4e4c-ac50-ed091dc4db4a" });
  const res = {
    base64: output as string,
    traits: [{ trait_type: "cute", value: "true" }, { trait_type: "fid", value: String(input.fid || 1) }],
    tokenId: String(nextTokenId),
    visibility: "PUBLIC",
    projectId: "0d53e5b6-5403-4e4c-ac50-ed091dc4db4a"
  }

  const metafuseReq = await POST(res);
  console.log(metafuseReq);

  const updatedImage = `https://api.metafuse.me/${metafuseReq?.key}`

  return c.res({
    image: updatedImage,
    action: '/finish',
    intents: [
      <Button.Transaction
        target="/mint"
      >
        Mint
      </Button.Transaction>,
    ]
  });
});

app.frame('/finish', (c) => {
  const { transactionId } = c
  return c.res({
    image: (
      <div style={{
        display: 'flex',
        height: '100%',
        width: '100%',
        backgroundImage: 'url(https://portalapistack-uploadbucket5b1e560c-1uw248zf0758m.s3.us-east-2.amazonaws.com/protected/us-east-2%3A52bd2aac-245a-45e7-87ad-c3b3f59431f6/0d53e5b6-5403-4e4c-ac50-ed091dc4db4a/backgrounds-0e144e7e-e2c0-4c28-aa21-0bab70bf5dc1-chibi_yay.jpg.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAR3QXGJWVBM5V4AOG%2F20240324%2Fus-east-2%2Fs3%2Faws4_request&X-Amz-Date=20240324T164325Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEGAaCXVzLWVhc3QtMiJIMEYCIQC6FIu%2B2r7elCKQa3eDzAbQa%2BzmJMe8LIy29JhFh1N4XwIhAIn2v0JhKVmOtafcXSgV9%2FndLVY%2FoKGMGo0s6wcj4au1KsQECHoQARoMMTI3ODIzOTI0NjUwIgx3rkoqGgYT%2BzJdvuMqoQTeF17uKlYf%2BtPkUKqRE87ZTQ%2BMCGmP51swuaVOQvkicRbbHwqLer3xJGlydU6fZhzXOG3HyX9vdVGeHlCSnbnrKF3RjCgHaA%2B%2BqtdvOD3bGSU1xev%2Fp5nxZBb0RGjNr42Eur6uitqoi0rEHJqn2ItrUgkQrcosOnCwk0JvK%2FzAHnAy%2FmKYzbAPnROU%2B%2FQZXSaZe%2FxXFqGj9iPzcYQ1%2B0O1Xqukan1fKoi3c2I3OXBzUeoXdlmJ5Ez35iJcaM0D8nE5k0yh0GCmaYB8YJj4rDlCBrwy1WS0JE1JlLUjd%2FUm%2B6kFJ3SNMCKTj5%2BNIhtKaOQygWghCT5VHD0VMDDxDGmMSsGuIL4wf2R%2FOqb8AzKp2lyu%2BBet2WSfkZBiuJg4kb81xfP6YeErNf3RhIgHSAeGjTtmSfvS9AGQo%2B6VV0d2xEaTibsFuqx%2FHsYdR7nW3F%2FNdFCvMEqc4fZT12iEHqjpITUkFa9cB0SrtmdkbIsyehHSd7g14U7j7jbPBr81tEgSLeYaDrehrZozb03Dt8W0S2x3PAySRJE5967MRbfwst4ZrImoyjh0NAurx50jY8YQDmQ5CiwDa5vml%2BJzyabsD2PTGLcqhYfRUTYr0nAtfc3MexYNTNjP2WmDJkOFLKVN%2BdgBFhaqr6BstzvyW6qvJlayl1fqk8HTn%2FUmnhNfC%2BPcEYUNpipKWijPtfVljecciB0mTY1u6wc4zfulq%2FmR4TCXp4GwBjqEAtyTvtceE4Lb%2FWvZZHIKVTJvZX5%2BZrO4TQQxaOhp9CXu9zd%2FC5iSf9vaTyhNhsaUr2IA9YakI2bj3gSxxKSu5zZ1IagtbwEV0b2gGcuTmQwArAg3iW4S8peFIFyLfxSIYbbRaFERs0bvQFzE72SkuNYBZkWiob3iaF%2Fi8blmkCMhy8Bf%2FtxOkj4lA4g6kTG%2F4wb6GMA5VGcX99zE74JEyvBK4QCeiqSQX5vLZdoYCtKo9y7nQIbX9s07WmYoS4zF11Mw5%2F0VO8TSn6Z3wBMr0tu7FIpRUF%2BPUHA26fA7mLNVwZzX0VsdeUhcbYN7CkjpGupG%2BlhcpZAPZgjRLEvRepwzKQk4&X-Amz-Signature=03dc51133fcc58e6f2ee775f3924df0553324f69320a40f7bcc7b0c5ad5aba0d&X-Amz-SignedHeaders=host&x-id=GetObject)'

      }}>
        Transaction ID: {transactionId}
      </div>
    )
  })
})

app.transaction('/mint', (c) => {
  console.log(c, 'transaction')
  // Contract transaction response.
  return c.contract({
    abi: ERC721ABI,
    chainId: 'eip155:84532',
    functionName: 'mint',
    args: [1],
    to: '0x7fa90ca34009f0ffc8dee49ed82d942fc032d355',
    value: parseEther("0.0001")
  })
})

const ERC721ABI = [{ "inputs": [{ "internalType": "string", "name": "_tokenName", "type": "string" }, { "internalType": "string", "name": "_tokenSymbol", "type": "string" }, { "internalType": "string", "name": "_baseUri", "type": "string" }, { "internalType": "bytes32", "name": "_merkleRoot", "type": "bytes32" }, { "internalType": "uint256", "name": "_maxSupply", "type": "uint256" }, { "internalType": "uint256", "name": "_maxAllowListMintAmount", "type": "uint256" }, { "internalType": "uint256", "name": "_maxMintAmountPerTx", "type": "uint256" }, { "internalType": "address", "name": "_paymentToken", "type": "address" }, { "components": [{ "internalType": "uint256", "name": "cost", "type": "uint256" }, { "internalType": "uint256", "name": "allowListCost", "type": "uint256" }], "internalType": "struct Generic721A.MintingCostData", "name": "_mintingCostData", "type": "tuple" }, { "components": [{ "internalType": "uint256", "name": "royaltyBps", "type": "uint256" }, { "internalType": "address", "name": "royaltyReceiver", "type": "address" }], "internalType": "struct Generic721A.RoyaltyData", "name": "_royaltyData", "type": "tuple" }], "stateMutability": "nonpayable", "type": "constructor" }, { "inputs": [], "name": "ApprovalCallerNotOwnerNorApproved", "type": "error" }, { "inputs": [], "name": "ApprovalQueryForNonexistentToken", "type": "error" }, { "inputs": [], "name": "BalanceQueryForZeroAddress", "type": "error" }, { "inputs": [], "name": "InvalidQueryRange", "type": "error" }, { "inputs": [], "name": "MintERC2309QuantityExceedsLimit", "type": "error" }, { "inputs": [], "name": "MintToZeroAddress", "type": "error" }, { "inputs": [], "name": "MintZeroQuantity", "type": "error" }, { "inputs": [], "name": "OwnerQueryForNonexistentToken", "type": "error" }, { "inputs": [], "name": "OwnershipNotInitializedForExtraData", "type": "error" }, { "inputs": [], "name": "TransferCallerNotOwnerNorApproved", "type": "error" }, { "inputs": [], "name": "TransferFromIncorrectOwner", "type": "error" }, { "inputs": [], "name": "TransferToNonERC721ReceiverImplementer", "type": "error" }, { "inputs": [], "name": "TransferToZeroAddress", "type": "error" }, { "inputs": [], "name": "URIQueryForNonexistentToken", "type": "error" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "owner", "type": "address" }, { "indexed": true, "internalType": "address", "name": "approved", "type": "address" }, { "indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "Approval", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "owner", "type": "address" }, { "indexed": true, "internalType": "address", "name": "operator", "type": "address" }, { "indexed": false, "internalType": "bool", "name": "approved", "type": "bool" }], "name": "ApprovalForAll", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "uint256", "name": "fromTokenId", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "toTokenId", "type": "uint256" }, { "indexed": true, "internalType": "address", "name": "from", "type": "address" }, { "indexed": true, "internalType": "address", "name": "to", "type": "address" }], "name": "ConsecutiveTransfer", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "previousOwner", "type": "address" }, { "indexed": true, "internalType": "address", "name": "newOwner", "type": "address" }], "name": "OwnershipTransferred", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "from", "type": "address" }, { "indexed": true, "internalType": "address", "name": "to", "type": "address" }, { "indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "Transfer", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "destination", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "Withdrawal", "type": "event" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "addressToAllowListMintAmount", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "allowListCost", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "_mintAmount", "type": "uint256" }, { "internalType": "bytes32[]", "name": "_merkleProof", "type": "bytes32[]" }], "name": "allowListMint", "outputs": [], "stateMutability": "payable", "type": "function" }, { "inputs": [], "name": "allowListMintingEnabled", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "approve", "outputs": [], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }], "name": "balanceOf", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "cost", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "explicitOwnershipOf", "outputs": [{ "components": [{ "internalType": "address", "name": "addr", "type": "address" }, { "internalType": "uint64", "name": "startTimestamp", "type": "uint64" }, { "internalType": "bool", "name": "burned", "type": "bool" }, { "internalType": "uint24", "name": "extraData", "type": "uint24" }], "internalType": "struct IERC721A.TokenOwnership", "name": "", "type": "tuple" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256[]", "name": "tokenIds", "type": "uint256[]" }], "name": "explicitOwnershipsOf", "outputs": [{ "components": [{ "internalType": "address", "name": "addr", "type": "address" }, { "internalType": "uint64", "name": "startTimestamp", "type": "uint64" }, { "internalType": "bool", "name": "burned", "type": "bool" }, { "internalType": "uint24", "name": "extraData", "type": "uint24" }], "internalType": "struct IERC721A.TokenOwnership[]", "name": "", "type": "tuple[]" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "feePercentageBps", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "feeRecipient", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "getApproved", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "getBalance", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "address", "name": "operator", "type": "address" }], "name": "isApprovedForAll", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "maxAllowListMintAmount", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "maxMintAmountPerTx", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "maxSupply", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "merkleRoot", "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "_mintAmount", "type": "uint256" }], "name": "mint", "outputs": [], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "_mintAmount", "type": "uint256" }, { "internalType": "address", "name": "_receiver", "type": "address" }], "name": "mintForAddress", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "name", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "owner", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "ownerOf", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "paymentToken", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "publicMintingEnabled", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "renounceOwnership", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "royaltyBps", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "_tokenId", "type": "uint256" }, { "internalType": "uint256", "name": "_salePrice", "type": "uint256" }], "name": "royaltyInfo", "outputs": [{ "internalType": "address", "name": "_receiver", "type": "address" }, { "internalType": "uint256", "name": "_royaltyAmount", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "royaltyReceiver", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "from", "type": "address" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "safeTransferFrom", "outputs": [], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "from", "type": "address" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" }, { "internalType": "bytes", "name": "_data", "type": "bytes" }], "name": "safeTransferFrom", "outputs": [], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "_cost", "type": "uint256" }], "name": "setAllowListCost", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "bool", "name": "_state", "type": "bool" }], "name": "setAllowListMintingEnabled", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "operator", "type": "address" }, { "internalType": "bool", "name": "approved", "type": "bool" }], "name": "setApprovalForAll", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "_cost", "type": "uint256" }], "name": "setCost", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "_maxAllowListMintAmount", "type": "uint256" }], "name": "setMaxAllowListMintAmount", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "_maxMintAmountPerTx", "type": "uint256" }], "name": "setMaxMintAmountPerTx", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "bytes32", "name": "_merkleRoot", "type": "bytes32" }], "name": "setMerkleRoot", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_paymentToken", "type": "address" }], "name": "setPaymentToken", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "bool", "name": "_state", "type": "bool" }], "name": "setPublicMintingEnabled", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "_royaltyBps", "type": "uint256" }], "name": "setRoyaltyBps", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_royaltyReceiver", "type": "address" }], "name": "setRoyaltyReceiver", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "string", "name": "_uriPrefix", "type": "string" }], "name": "setUriPrefix", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "string", "name": "_uriSuffix", "type": "string" }], "name": "setUriSuffix", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "bytes4", "name": "interfaceId", "type": "bytes4" }], "name": "supportsInterface", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "symbol", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "_tokenId", "type": "uint256" }], "name": "tokenURI", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }], "name": "tokensOfOwner", "outputs": [{ "internalType": "uint256[]", "name": "", "type": "uint256[]" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "uint256", "name": "start", "type": "uint256" }, { "internalType": "uint256", "name": "stop", "type": "uint256" }], "name": "tokensOfOwnerIn", "outputs": [{ "internalType": "uint256[]", "name": "", "type": "uint256[]" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "totalMinted", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "totalSupply", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "from", "type": "address" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "transferFrom", "outputs": [], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "newOwner", "type": "address" }], "name": "transferOwnership", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "uriPrefix", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "uriSuffix", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_destination", "type": "address" }, { "internalType": "uint256", "name": "_amount", "type": "uint256" }], "name": "withdraw", "outputs": [], "stateMutability": "nonpayable", "type": "function" }]

devtools(app, {
  serveStatic
})

