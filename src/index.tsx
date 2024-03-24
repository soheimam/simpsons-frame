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
            text:
              `Based on the image, provide a detailed character description suitable for creating a chibi-style anime illustration., 
              Note the gender, hair color, and [hair style], eye color, and any notable expressions or emotions conveyed., 
              Highlight key features that should be exaggerated in a chibi rendition, like eye size or head shape, 
              Describe the clothing style and any distinctive accessories, ensuring they can be adapted to a cute, simplified anime form. 
              Suggest a single color background that matches the overall tone of the photo, be it warm, fun, or colorful, 
              and ensures the single chibi character will be the focal point with a friendly and engaging expression.`
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
// async function convertAndEditImage(_prompt: string) {
//   try {
//     const Originalprompt =
//       `Create a single chibi-style close up portrait of a single  anime character, 
//       based on the following description: ${_prompt}. The character should have hair and eye colors that match the description provided. 
//       Dress them in clothing and accessories as described. 
//       The character has typical chibi characteristics: a disproportionately larger head and eyes, and a smaller body. 
//       The character should be facing the viewer with a welcoming and warm expression,The style should be clean, bright, and reminiscent of high-quality digital anime illustrations.`;


//     const prompt = `DO NOT add any detail, just use it AS-IS: ${Originalprompt}`;

//     // Use the image stream directly for the OpenAI call
//     const openAiResponse = await openAi.images.generate({
//       // image: imageStream,
//       model: "dall-e-3",
//       response_format: 'b64_json',
//       style: "natural",
//       size: "1024x1024",
//       prompt: prompt,
//     });



//     return openAiResponse.data[0].b64_json;
//   } catch (error) {
//     console.error('Error:', error);
//   }
// }

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
  console.log(status, frameData, 'status')
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
      <div style={{ backgroundImage: 'url("https://portalapistack-uploadbucket5b1e560c-1uw248zf0758m.s3.us-east-2.amazonaws.com/protected/us-east-2%3A52bd2aac-245a-45e7-87ad-c3b3f59431f6/0d53e5b6-5403-4e4c-ac50-ed091dc4db4a/backgrounds-922bb2f5-da02-48d4-a7c6-a7568913d99a-bg_pink.jpeg.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAR3QXGJWVAO4VLWFI%2F20240324%2Fus-east-2%2Fs3%2Faws4_request&X-Amz-Date=20240324T140007Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEF4aCXVzLWVhc3QtMiJHMEUCIDUAR%2FGY0YQUpwRrAHZmtoWr86CH3hecCb%2FV4FsDXcGCAiEAmCQB9GRQMsi8vYBbZs5Z1AQ%2BFGvMtnodhzvg14SzMWYqxAQIdxABGgwxMjc4MjM5MjQ2NTAiDNNymsLloA0q14zlmyqhBOMmykhJtPV%2FaGSN82Ti%2FumW3i4jX9attkskEOLmJY%2FTUAFE0T2Bi31wX5eTpi0ivAIMGBe9N0w6xBzqe3PobEWiQmVUiGHTWoZgRQqwKXefSK7mFded%2BtcXdGgDdIZL2XCfPmefLkWGrb0ptWkoC%2BW86huKqgJLHJF7Y14GmiYXFw0lbGcITB1jFD4yi5tr89JbN8zswD1CmxFSxsBeWr01u27prGplyPpucvlRnK8g%2Byok6NYyjw3O5sNeU4C8y5BI6wWHqEUNXmyQErmu9bexpGh26jpJBOp13vIJ8ISgi4XNeLWSIJ3a%2Fb94yiey3abxzc9SwpkKMiDd3Kcjr4ma3MxJnVbCPKHwjB8ok9keEdSyFPG8ygVkZwPWMZGI813Xq9yuTEJipJ8LglMw0gPLawZaAN3uvkCyLRMu1yr2pfjNHzr2ggWCrd37fdZsOzjj2V6s%2BQ1VYaYwT4za1Cp81n7aaN39mSHvUv5vgFO56af0Fi46MqUVJezRzthGU19EQdArOPkXvPqFtja3x4QMIRXCfnr3%2BNaNXaEc8SwuCQcgfl4%2FjK8c7O6NOxWQWy5Izom6UacuC%2BBhoLi0QW%2FcojIO%2BiFfE7%2FSiTx%2FHss%2FjOmjJpUYryYkOq0dsAiRhxbE2drt5630mIgy8NWwV3J913EaEBOjGw7%2BBxCr8KMfX52wzt97Fzvcy2QvqFpPqs3p5IGepSOds99iR8veXAthMKfjgLAGOoUCnxpQU3GQJ8jUvWNzM82MqPEncZyPPbWjflQYGngTCgdXFwFFvv9q3AQod1ypTHSXGizwgmXtG6koZS5xOIEZ%2Bh4cdvSMtUOd4kMfiZhD3XfyOjKx1fwJ%2F6XsLU2tcuXNEgwNG%2FNA5ZAKiOcg6dCsK7ZtyicIwh0P%2BpUVM526xJeFAbzHTiInClm9oeAnM4RMDyfWv7HDiyTU6N6z16tZ%2B7VzwqGL7pG15mL28HavEMTlI0P5v2TXVpGozOaUEtB0yi6Edb1dzvEcQ4ASC7BbiUyxdq7hMuQkku6oCUoNCEiY6j09xauJeor6V20FhoGvC4eES9YkwZ4%2Bzc5dzMNx12bxpEoU&X-Amz-Signature=4939f836e866cd9de985880eb6bcd70bf76cb226066d1c340aaf04289a2a9fe5&X-Amz-SignedHeaders=host&x-id=GetObject")', height: '100%', width: '100%', backgroundSize: 'cover', color: 'purple', fontWeight: '100', display: 'flex', alignItems: "center", justifyItems: "center", fontSize: 60 }}>
        Click to cuteify your image
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
      <div style={{ color: 'white', display: 'flex', alignItems: "center", justifyItems: "center", fontSize: 60 }}>
        Join the Simpsons channel to cuteify your image
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
      <div style={{ color: 'white', display: 'flex', fontSize: 60 }}>
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

