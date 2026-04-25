import { generateRaw } from "../../../../../script.js";
import ExtensionStorage from "../storage/ExtensionStorage.js";

async function testAuxil()
{
    return new Promise(async (resolve,reject)=>{
        const url = ExtensionStorage.get("auxil_url", ExtensionStorage.Defaults.auxil_url) + "/api/status";
        try
        {
            const response = await fetch(url);
            return resolve(response.ok);
        }
        catch (error)
        { console.error("Error connecting to Auxil:", error); }
        return resolve(false);
    })
}

/** @returns {Promise<object>} */
async function sendGenerationRequest(prompt, options = {}, format = "json")
{
    const auxilPromise = new Promise(async (resolve, reject) => {
        const url = ExtensionStorage.get("auxil_url", ExtensionStorage.Defaults.auxil_url) + "/api/generate";
        const model = ExtensionStorage.get("auxil_model", ExtensionStorage.Defaults.auxil_model);
        try
        {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model,
                    prompt,
                    options,
                    format
                })
            });
            if (response.ok)
            {
                const data = await response.json();
                return resolve(data);
            }
            else
            {
                const errorData = await response.json();
                console.error("Error from Auxil:", errorData.error || "Unknown error");
                return reject(new Error(errorData.error || "Unknown error"));
            }
        }catch(e)
        {
            console.error("Error during Auxil generation request:", e);
            return reject(e);
        }
        return reject(new Error("Failed to get a valid response from Auxil"));
    })
    if (!ExtensionStorage.get("use_main_api_fallback", ExtensionStorage.Defaults.use_main_api_fallback))
    {return await auxilPromise;}
    // If auxil fails to respond validly then request the main api to generate the response.
    try{
        const mainApiResponse = await generateRaw({
            prompt: prompt,
            jsonSchema: format !== "json" ? undefined : ExtensionStorage.get("json_schema", ExtensionStorage.Defaults.json_schema),
        })
        return {
            "mainApiFallback": true,
            "status": 200,
            "response": await generateRaw({
                prompt: prompt,
                jsonSchema: format !== "json" ? undefined : ExtensionStorage.get("json_schema", ExtensionStorage.Defaults.json_schema),
            }),
            "ok": true
        }
    }catch(e)
    {        
        console.error("Error during main API fallback generation request:", e);
        return {
            "mainApiFallback": true,
            "status": 500,
            "error": e.message || "Unknown error during main API fallback generation",
            "ok": false
        }
    }
}

export { testAuxil, sendGenerationRequest };