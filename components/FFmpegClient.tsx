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
  const [advancedOptions, setAdvancedOptions] = useState<string>("");
  const [outputFileExtension, setOutputFileExtension] = useState<string>("");
  const downloadLinkRef = useRef<HTMLAnchorElement | null>(null);
  const errorModalRef = useRef<HTMLDialogElement | null>(null);
  const errorModalMessageRef = useRef<HTMLParagraphElement | null>(null);

  const load = async () => {
    const ffmpeg = ffmpegRef.current;

    ffmpeg.on("log", ({ type, message }) => {
      console.log(`${type}\t| ${message}`);
    });
    ffmpeg.on("progress", ({ progress, time }) => {
      console.log(time, progress);
      if (progress > 0 && progress <= 1) setProgress(progress * 100);
    });

    // toBlobURL is used to bypass CORS issue, urls with the same domain can be used directly.
    try {
      // multi-threaded version
      const baseURL = "https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
        workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, "text/javascript"),
      });
    } catch (e) {
      console.log("Cannot load multi-threaded version due to", e);
      // single-threaded version
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });
    }

    // await ffmpeg.exec(["-formats"]);
    // await ffmpeg.exec(["-codecs"]);

    setLoaded(true);
  };

  const transcode = async () => {
    const ffmpeg = ffmpegRef.current;

    if (!inputFile) {
      errorModalMessageRef.current!.innerText = "No file input!";
      errorModalRef.current!.showModal();
      return;
    }
    if (!outputFileExtension) {
      errorModalMessageRef.current!.innerText = "No output format!";
      errorModalRef.current!.showModal();
      return;
    }

    await ffmpeg.writeFile("INPUT", await fetchFile(inputFile));
    const outputFileName = inputFile.name.replace(/\.[^.]*$/, `.${outputFileExtension}`);

    if (
      (await ffmpeg.exec([
        "-i",
        "INPUT",
        ...(advancedOptions ? advancedOptions.trim().split(/\s+/) : []),
        outputFileName,
      ])) !== 0
    ) {
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
    <div className="m-4 w-full max-w-xl font-mono">
      <div className="mockup-code overflow-visible bg-zinc-100 text-base-content dark:bg-[#2a323c]">
        <pre data-prefix="$">
          <code className="text-success">ffmpeg</code>
          <code className="whitespace-nowrap text-nowrap"> -i \</code>
        </pre>

        <pre data-prefix=">" className="mt-2 flex items-center">
          <div className="flex w-[80%] flex-grow items-center py-1">
            <Dropzone
              onDrop={(acceptedFiles) => {
                setInputFile(acceptedFiles[0]);
                setProgress(0); // reset progress
              }}
            >
              {({ getRootProps, getInputProps, isDragActive }) => (
                <div
                  {...getRootProps()}
                  className={`input-bordered flex min-h-14 w-full cursor-pointer items-center truncate rounded-lg border-2 border-dashed bg-base-100 px-4 py-2 transition-all hover:bg-gray-200 dark:hover:bg-gray-600 ${
                    isDragActive ? "bg-gray-300 dark:bg-gray-500" : ""
                  }`}
                >
                  <input {...getInputProps()} multiple={false} className="hidden" />
                  {inputFile ? (
                    <>
                      <FileIcon className="mr-4 h-6 min-h-6 w-6 min-w-6" />
                      <p className="truncate">{inputFile.name.slice(0, -8)}</p>
                      <p className="text-nowrap">{inputFile.name.slice(-8)}</p>
                    </>
                  ) : (
                    <>
                      <UploadIcon className="mr-4 h-6 min-h-6 w-6 min-w-6" />
                      <p className="whitespace-normal text-balance">Drag & drop, or click to select files</p>
                    </>
                  )}
                </div>
              )}
            </Dropzone>
            <code className="ml-2 whitespace-nowrap text-nowrap">\</code>
          </div>
        </pre>

        <pre data-prefix=">" className="flex items-center">
          <div className="flex w-[80%] flex-grow items-center py-1">
            <input
              type="text"
              className="input input-bordered min-h-14 w-full placeholder:dark:text-gray-500"
              placeholder="🚀🚀🚀 advanced options"
              spellCheck={false}
              value={advancedOptions}
              onChange={(e) => {
                setAdvancedOptions(e.target.value);
                setProgress(0); // reset progress
              }}
            />
            <code className="ml-2 whitespace-nowrap text-nowrap">\</code>
          </div>
        </pre>

        <pre data-prefix=">" className="flex items-center">
          <div className="flex w-[80%] flex-grow items-center py-1">
            <div className="flex-1" />
            <div className="mr-1 flex items-center overflow-x-hidden">
              <p className="truncate">{inputFile ? inputFile.name.replace(/\.[^.]*$/, "") : "output"}</p>
              <p className="text-nowrap">.</p>
            </div>
            <input
              type="text"
              className={`input input-bordered min-w-16 max-w-32 placeholder:dark:text-gray-500 ${
                !outputFileExtension
                  ? ""
                  : mime.lookup(outputFileExtension)
                    ? "focus:outline-success"
                    : "outline outline-2 outline-offset-2 outline-warning focus:outline-warning"
              }`}
              placeholder="extension"
              spellCheck={false}
              value={outputFileExtension}
              onChange={(e) => {
                if (/^\w*$/.test(e.target.value)) {
                  setOutputFileExtension(e.target.value.toLocaleLowerCase());
                  setProgress(0); // reset progress
                }
              }}
            />
            <code className="ml-2 whitespace-nowrap text-nowrap">&nbsp;</code>
            <p
              className={`absolute bottom-0 right-0 -translate-x-8 rounded-md bg-base-100 p-1 text-right text-xs text-warning transition-all ${
                !outputFileExtension || mime.lookup(outputFileExtension)
                  ? " translate-y-3 opacity-0"
                  : "translate-y-2 opacity-100"
              }`}
            >
              unknown extension, might fail
            </p>
          </div>
        </pre>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <progress
          // className={`progress progress-success m-2 h-0.5 bg-base-100 transition-opacity ${progress === 100 ? "opacity-0" : ""}`}
          className="progress progress-success m-2 h-0.5"
          value={progress}
          max="100"
        ></progress>
        <a
          ref={downloadLinkRef}
          className={`btn btn-success m-2 flex items-center justify-center text-success-content ${
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
          <ErrorIcon className="mr-4 h-10 w-10" />
          <p ref={errorModalMessageRef} className="w-full text-balance text-center text-lg font-bold"></p>
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
