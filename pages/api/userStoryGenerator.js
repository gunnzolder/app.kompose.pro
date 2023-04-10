import { Configuration, OpenAIApi } from "openai";
import { createReadStream } from "fs";
import formidable from "formidable";
import csv from "csvtojson";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function (req, res) {

    if (!configuration.apiKey) {
      console.error("OpenAI API key not configured");
      return;
    }

    if (req.method === "POST") {
      try {
        const form = formidable({ multiples: true });
        
        form.parse(req, async (err, fields, files) => {

          if (err) {
            console.log("ERROR: " + err);
            res.status(500).json({ error: "Error parsing form data" });
            return;
          }

          const appName = fields.appName || "";
          const appDescription = fields.appDescription || "";
          const appGlossaryCsv = files.appGlossaryCsv.path || "";
          const userStoryTitle = fields.userStoryTitle || "";
          
          const readStream = createReadStream(files.appGlossaryCsv.filepath);

          try {
            // console.log(readStream);

            csv()
              .fromStream(readStream)
              .then(async (appGlossary) => {
                const chatCompletion = await openai.createChatCompletion({
                  model: "gpt-3.5-turbo",
                  messages: [
                    {
                      role: "user",
                      content: generatePrompt(
                        appName,
                        appDescription,
                        appGlossary,
                        userStoryTitle
                      ),
                    },
                  ],
                  max_tokens: 1200,
                  temperature: 0.7,
                });
                res.status(200).json({ result: chatCompletion.data.choices[0].message.content });
                console.log(chatCompletion.data.choices[0].message.content);

                // res.status(200).json({
                //   message: "File uploaded",
                //   data: {
                //     appName: appName,
                //     appDescription: appDescription,
                //     userStoryTitle: userStoryTitle,
                //     appGlossary: appGlossary,
                //   },
                // });
              });
          } catch (error) {
            console.error(`Error uploading file: ${error.message}`);
            res.status(500).json({ error: "Error uploading file" });
          }
        });
      } catch (error) {
        console.error(`Error uploading file: ${error.message}`);
        res.status(500).json({ error: "Error uploading file" });
      }
    } else {
      res.status(405).json({ error: "Method not allowed" });
    }
};
    function generatePrompt(
      appName,
      appDescription,
      appGlossary,
      userStoryTitle
    ) {
      return `
      I want you to act as a product manager assistant. I will provide some details about the design of an app as a Glossary in JSON fprmat, and you will help me with generating the user story content from the user story title.

      CONTEXT: The app name is "${appName}". 
      "${appDescription}"

      GLOSSARY: "${appGlossary}"

      USER STORY TITLE: "${userStoryTitle}"
      `;
    }