"use client";

import { useRef, useState, useEffect } from "react";

import Dropzone from "react-dropzone";
import {
  ArrowDownTrayIcon as DownloadIcon,
  ArrowUpTrayIcon as UploadIcon,
  DocumentTextIcon as FileIcon,
} from "@heroicons/react/24/outline";
import { ExclamationTriangleIcon as ErrorIcon } from "@heroicons/react/24/solid";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import mime from "mime-types";

export default function FFmpegClient() {
  const ffmpegRef = useRef<FFmpeg>(new FFmpeg());
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [inputFile, setInputFile] = useState<File | null>(null);
  const [outputFileFormat, setOutputFileFormat] = useState<string>("");
  const downloadLinkRef = useRef<HTMLAnchorElement | null>(null);
  const errorModalRef = useRef<HTMLDialogElement | null>(null);
  const errorModalMessageRef = useRef<HTMLParagraphElement | null>(null);

  const load = async () => {
    const ffmpeg = ffmpegRef.current;

    ffmpeg.on("log", ({ type, message }) => {
      console.log(type, message);
    });
    ffmpeg.on("progress", ({ progress, time }) => {
      console.log(time, progress * 100);
      if (progress > 0) setProgress(progress * 100);
    });

    // toBlobURL is used to bypass CORS issue, urls with the same domain can be used directly.
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });

    setLoaded(true);
  };

  const transcode = async () => {
    const ffmpeg = ffmpegRef.current;

    if (!inputFile) {
      errorModalMessageRef.current!.innerText = "No file input!";
      errorModalRef.current!.showModal();
      return;
    }
    if (!outputFileFormat) {
      errorModalMessageRef.current!.innerText = "No output format!";
      errorModalRef.current!.showModal();
      return;
    }

    await ffmpeg.writeFile(inputFile.name, await fetchFile(inputFile));
    const outputFileName = inputFile.name.replace(/\.[^.]*$/, `.${outputFileFormat}`);

    if ((await ffmpeg.exec(["-i", inputFile.name, outputFileName])) !== 0) {
      errorModalMessageRef.current!.innerText = "FFmpeg failed! Check browser console log for more information.";
      errorModalRef.current!.showModal();
      return;
    }

    const data = (await ffmpeg.readFile(outputFileName)) as any;
    const blob = new Blob([data.buffer]);
    downloadLinkRef.current!.href = URL.createObjectURL(blob);
    downloadLinkRef.current!.download = outputFileName;
  };

  useEffect(() => {
    load();
  }, []);

  return loaded ? (
    <div className="m-4 w-full max-w-lg">
      <div className="flex items-center justify-between">
        <div className="tooltip tooltip-right tooltip-primary" data-tip="input file">
          <code className="kbd m-2 min-w-fit whitespace-nowrap text-nowrap font-mono">-i</code>
        </div>
        <Dropzone
          onDrop={(acceptedFiles) => {
            setInputFile(acceptedFiles[0]);
            setProgress(0); // reset progress
          }}
        >
          {({ getRootProps, getInputProps, isDragActive }) => (
            <div
              {...getRootProps()}
              className={`m-2 flex min-h-14 w-full max-w-[410px] cursor-pointer items-center truncate rounded-lg border-2 border-dashed border-gray-300 bg-gray-100 pr-4 font-mono transition-all hover:bg-gray-200 dark:border-gray-500 dark:bg-gray-700 dark:hover:bg-gray-600 ${
                isDragActive ? "bg-gray-300 dark:bg-gray-500" : ""
              }`}
            >
              <input {...getInputProps()} multiple={false} className="hidden" />
              {inputFile ? (
                <>
                  <FileIcon className="mx-4 h-6 min-h-6 w-6 min-w-6" />
                  <p className="truncate">{inputFile.name.slice(0, -8)}</p>
                  <p className="text-nowrap">{inputFile.name.slice(-8)}</p>
                </>
              ) : (
                <>
                  <UploadIcon className="mx-4 h-6 min-h-6 w-6 min-w-6" />
                  <p className="whitespace-normal text-balance text-sm">Drag & drop, or click to select a file</p>
                </>
              )}
            </div>
          )}
        </Dropzone>
      </div>

      {/* <div className="flex items-center justify-between">
        <code className="kbd m-2 min-w-fit whitespace-nowrap text-nowrap font-mono">-codec:v</code>
        <select className="select select-bordered m-2 w-full max-w-fit" defaultValue="Select video codec">
          <option disabled>Select video codec</option>
        </select>
      </div>

      <div className="flex items-center justify-between">
        <code className="kbd m-2 min-w-fit whitespace-nowrap text-nowrap font-mono">-codec:a</code>
        <select className="select select-bordered m-2 w-full max-w-fit" defaultValue="Select audio codec">
          <option disabled>Select audio codec</option>
        </select>
      </div> */}

      <div className="flex items-center justify-between">
        <div className="tooltip tooltip-right tooltip-primary" data-tip="output file format">
          <code className="kbd m-2 min-w-fit whitespace-nowrap text-nowrap font-mono">fmt</code>
        </div>
        <select
          className="select select-bordered m-2 w-full max-w-fit font-mono"
          onChange={(e) => {
            setOutputFileFormat(e.target.value);
            setProgress(0); // reset progress
          }}
          defaultValue="Select output format"
        >
          <option disabled>Select output format</option>
          {Object.entries(mime.types)
            .filter(
              ([ext, mimeType]) =>
                (inputFile ? mimeType.toLowerCase().startsWith(inputFile.type.split("/")[0].toLowerCase()) : true) &&
                ext.length <= 8,
            )
            .toSorted((a, b) => a[0].localeCompare(b[0]))
            .map(([ext, mimeType]) => (
              <option key={ext}>{ext}</option>
            ))}
        </select>
      </div>

      <div className="mb-1 ml-4 mr-2 mt-6">
        <progress className="progress progress-success h-0.5" value={progress} max="100"></progress>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex-1"></div>
        <a
          ref={downloadLinkRef}
          className={`btn btn-success m-2 flex items-center justify-center  ${
            progress === 100 ? "shadow-lg shadow-success/50" : "btn-disabled"
          }`}
        >
          <DownloadIcon className="h-6 w-6" />
          <p>Download</p>
        </a>
        <button
          onClick={() => {
            setProgress(-1); // prevent user from clicking the button again
            transcode();
          }}
          className={`btn btn-info m-2 transition ${progress === 0 ? "shadow-lg shadow-info/50" : "btn-disabled"}`}
        >
          Run
        </button>
      </div>

      <dialog ref={errorModalRef} className="modal">
        <div className="modal-box flex items-center text-error">
          <ErrorIcon className="mx-4 h-10 w-10" />
          <p ref={errorModalMessageRef} className="w-full text-balance text-center font-mono text-lg font-bold"></p>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </div>
  ) : (
    // loading ffmpeg-core
    <span className="loading loading-spinner loading-lg m-4"></span>
  );
}
