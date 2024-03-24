
export async function POST(res: { base64: string, traits: any[], tokenId: string, visibility: string, projectId: string }) {

    console.log(res);
    const base64Body = res?.base64;
    const traits = res?.traits;
    const tokenId = res?.tokenId;
    const visibility = res?.visibility;
    const projectId = res?.projectId;
    const metafuseAPIKey = process.env.METAFUSE_API_KEY as string;
    const metafuseAPI = "https://gateway.metafuse.me/v1/item";

    const req = await fetch(metafuseAPI, {
        method: "POST",
        headers: {
            ContentType: "application/json",
            Authorization: metafuseAPIKey,
        },
        body: JSON.stringify({
            visibility: visibility || "PUBLIC",
            image: base64Body,
            traits: traits,
            tokenId: +tokenId,
            projectId,
        }),
    });
    const json = await req.json();
    console.log(json);
    return json
}