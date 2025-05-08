import express, { Express, Request, Response, RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";
import cors from "cors";

const app: Express = express();
app.use(cors()); // Allow CORS for frontend requests
app.use(express.json());

const supabaseUrl: string = "https://ceeitbbaooocsrhtmcsk.supabase.co"; // Replace with your Supabase URL
const supabaseKey: string = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlZWl0YmJhb29vY3NyaHRtY3NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2ODEwOTYsImV4cCI6MjA2MjI1NzA9Nn0.8qOj5QLLGu46Tz3qurSjMBTyUmkH5V8YzvQZtM01bMc"; // From Supabase dashboard
const supabase = createClient(supabaseUrl, supabaseKey);

// Define an async request handler type
type AsyncRequestHandler = (req: Request, res: Response) => Promise<void>;

// Endpoint to handle new task notifications
app.post("/new-task", (async (req: Request<{}, any, { taskId: string; url: string; filter: string; label: string; format: string }>, res: Response) => {
  try {
    const { taskId, url, filter, label, format } = req.body;
    if (!taskId || !url || !filter || !label || !format) {
      return res.status(400).json({ error: "taskId, url, filter, label, and format are required" });
    }

    // Log the incoming task data for debugging
    console.log("Received new task:", { taskId, url, filter, label, format });

    // Placeholder: Add logic to process the task (e.g., scrape the URL and upload to Supabase)
    // For now, just acknowledge the task
    res.json({ message: `Task ${taskId} received successfully`, taskDetails: { taskId, url, filter, label, format } });
  } catch (error: any) {
    console.error("Error handling new task:", error);
    res.status(500).json({ error: error.message });
  }
}) as AsyncRequestHandler);

// Endpoint to upload scraped data to Supabase Storage
app.post("/upload", (async (req: Request<{}, any, { taskId: string; data: string }>, res: Response) => {
  try {
    const { taskId, data } = req.body;
    if (!taskId || !data) {
      return res.status(400).json({ error: "taskId and data are required" });
    }

    const filePath = `tasks/${taskId}/data.jsonl`;
    const { error: uploadError } = await supabase.storage
      .from("scraped-data")
      .upload(filePath, data, {
        contentType: "application/jsonl",
        upsert: true, // Overwrite if file already exists
      });

    if (uploadError) {
      throw new Error(`Failed to upload to Supabase Storage: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from("scraped-data")
      .getPublicUrl(filePath);

    res.json({ downloadUrl: urlData.publicUrl });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}) as AsyncRequestHandler);

// Endpoint to download data from Supabase Storage (optional, if you want to proxy downloads through the backend)
app.get("/download/:taskId", (async (req: Request<{ taskId: string }>, res: Response) => {
  try {
    const { taskId } = req.params;
    const filePath = `tasks/${taskId}/data.jsonl`;
    const { data: urlData } = supabase.storage
      .from("scraped-data")
      .getPublicUrl(filePath);

    // Redirect to the public URL (or fetch and stream the file if you want to proxy it)
    res.redirect(urlData.publicUrl);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}) as AsyncRequestHandler);

// Add your existing backend logic here (e.g., task assignment, etc.)

const PORT: number = parseInt(process.env.PORT || "3000", 10);
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});