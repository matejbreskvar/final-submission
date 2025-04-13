import { spawn } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

// ES Module equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PlotOptions {
  functions: string[]; // Array of function expressions (e.g., "x^2", "sin(x)")
  xRange?: [number, number]; // Optional x-axis range
  yRange?: [number, number]; // Optional y-axis range
  title?: string;
  outputPath?: string; // Where to save the image
  width?: number;
  height?: number;
}

/**
 * Plots mathematical functions using a Python subprocess
 * @param options PlotOptions configuration
 * @returns Promise with the path to the generated image
 */
export async function plotFunctions(options: PlotOptions): Promise<string> {
  const defaultOptions: Partial<PlotOptions> = {
    xRange: [-10, 10],
    title: "Function Plot",
    outputPath: path.join(__dirname, "..", "temp", `plot_${Date.now()}.png`),
    width: 800,
    height: 600,
  };

  // Merge default options with provided options
  const config = { ...defaultOptions, ...options };

  // Ensure output directory exists
  const outputDir = path.dirname(config.outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Format the data to be passed to Python
  const plotData = JSON.stringify({
    functions: config.functions,
    xRange: config.xRange,
    yRange: config.yRange,
    title: config.title,
    outputPath: config.outputPath,
    width: config.width,
    height: config.height,
  });

  // Get the path to the Python script
  const pythonScriptPath = path.join(__dirname, "plotter.py");

  return new Promise((resolve, reject) => {
    // Spawn the Python process
    const pythonProcess = spawn("python", [pythonScriptPath, plotData]);

    let resultData = "";
    let errorData = "";

    // Collect output from the Python script
    pythonProcess.stdout.on("data", (data) => {
      resultData += data.toString();
    });

    // Collect error output
    pythonProcess.stderr.on("data", (data) => {
      errorData += data.toString();
    });

    // Handle process completion
    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Python process exited with code ${code}. Error: ${errorData}`));
        return;
      }

      try {
        const result = JSON.parse(resultData.trim());
        if (result.error) {
          reject(new Error(result.error));
        } else {
          resolve(result.imagePath);
        }
      } catch (err) {
        reject(new Error(`Failed to parse Python output: ${resultData}`));
      }
    });
  });
}