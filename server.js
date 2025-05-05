require("dotenv").config();
const express = require("express");
const path = require("path");
const multer = require("multer");
const fs = require("fs");


const {GoogleGenerativeAI} = require("@google/generative-ai");

const app = express();

const uploads = multer({ dest: "uploads/" });

//If can't access the api key the program exits
if(!process.env.GEMINI_API_KEY){
  console.error("Error: env file missing the API Key");
  process.exit(1);
}

//Instantiate the ai
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(express.urlencoded({extended:true}));;
app.use(express.json());
app.use(express.static(path.join(__dirname,"public")));

//Get the html file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// POST endpoint to handle user input and optional file upload
app.post("/get", uploads.single("file"), async (req, res) => {
  const userInput = req.body.msg; // User's text input
  const file = req.file; // Uploaded file (if any)

  try {
    // Get the Generative AI model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Initialize the prompt with user input
    let prompt = [userInput];

    // If a file is uploaded, read its contents and prepare it as inline image data
    if (file) {
      const fileData = fs.readFileSync(file.path); // Read file from the temporary location
      const image = {
        inlineData: {
          data: fileData.toString("base64"), // Convert file data to Base64
          mimeType: file.mimetype, // Specify the MIME type of the file
        },
      };
      prompt.push(image); // Append the image data to the prompt
    }

    // Generate content using the AI model
    const response = await model.generateContent(prompt);

    // Send the generated text response to the client
    res.send(response.response.text());
  } catch (error) {
    console.error("Error generating response: ", error); // Log any errors
    res.status(500).send("An error occurred while generating the response");
  } finally {
    // Cleanup: Delete the uploaded file to free up space
    if (file) {
      fs.unlinkSync(file.path);
    }
  }
});

// Start the server on the specified port (default: 3000)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});