
export async function GET(res: { projectId: string }) {
    const projectId = res?.projectId;
    const metafuseAPIKey = process.env.METAFUSE_API_KEY as string;
    const metafuseAPI = `https://gateway.metafuse.me/v1/items/${projectId}`;

    const req = await fetch(metafuseAPI, {
        method: "GET",
        headers: {
            ContentType: "application/json",
            Authorization: metafuseAPIKey,
        },
    });
    const json = await req.json();
    console.log(`Next Token Number is ${json.items?.length || 1}`);
    return json.items?.length + 1 || 1
}