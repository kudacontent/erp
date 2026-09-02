import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * 회의 녹음은 항상 MP3 로 보관한다.
 *
 * 브라우저 녹음은 webm/opus 로 나오고, 사람들이 올리는 파일은 m4a·wav·amr 등 제각각이다.
 * 그대로 두면 몇 년 뒤 열어 보려 할 때 재생되는 것과 안 되는 것이 섞이고,
 * 회의록 검토처럼 "예전 녹음을 다시 듣는" 일이 그때 막힌다.
 * MP3 는 어디서나 열린다.
 *
 * 64kbps 모노로 굽는다. 말소리에는 충분하고 1시간에 약 28MB 다.
 * 전사용으로 따로 줄이지 않는 이유: Gemini Files API 는 파일당 2GB 를 받으므로
 * 크기를 맞추려고 음질을 깎을 필요가 없다. Gemini 가 내부에서 알아서 다운샘플링한다.
 */
type Mp3Profile = "archive";

const PROFILE_ARGS: Record<Mp3Profile, string[]> = {
  archive: ["-vn", "-ac", "1", "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "64k"]
};

export class AudioConversionError extends Error {}

/**
 * 파일 경로를 받아 MP3 파일을 만든다.
 *
 * 바이트 배열이 아니라 경로를 주고받는 이유:
 * 예전에는 업로드한 파일을 통째로 메모리에 올린 뒤 ffmpeg 에 넘겼다.
 * 그러면 1GB 짜리 녹음을 올릴 때 메모리도 1GB 를 쓰고, NAS 에서는 컨테이너가 죽는다.
 * ffmpeg 은 파일을 직접 읽고 쓸 수 있으므로, 우리는 경로만 넘기면 된다.
 * 이 방식이면 파일이 아무리 커도 메모리 사용량은 일정하다.
 */
export async function convertFileToMp3(inputPath: string, outputPath: string, profile: Mp3Profile) {
  try {
    await execFileAsync(
      "ffmpeg",
      ["-hide_banner", "-loglevel", "error", "-y", "-i", inputPath, ...PROFILE_ARGS[profile], outputPath],
      // 긴 회의도 처리해야 하므로 넉넉히 준다. 그래도 무한정 매달려 있지는 않게 한다.
      { timeout: 60 * 60 * 1000, maxBuffer: 8 * 1024 * 1024 }
    );

    const converted = await stat(outputPath);

    if (!converted.size) {
      throw new AudioConversionError("변환 결과가 비어 있습니다.");
    }

    return converted.size;
  } catch (error) {
    if (error instanceof AudioConversionError) {
      throw error;
    }

    console.error("Meeting audio conversion failed", {
      profile,
      inputPath,
      error: error instanceof Error ? error.message : "unknown error"
    });

    throw new AudioConversionError(
      "오디오 파일을 MP3 로 변환하지 못했습니다. 손상된 파일이거나 지원하지 않는 형식일 수 있습니다."
    );
  }
}

/** 업로드로 받을 수 있는 오디오인지 (브라우저가 mime 을 비워 보내는 경우가 있어 확장자도 본다) */
export function looksLikeAudio(mimeType: string, fileName: string) {
  if (mimeType.startsWith("audio/") || mimeType === "video/mp4" || mimeType === "video/webm") {
    return true;
  }

  const extension = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() : "";
  return ["mp3", "m4a", "wav", "aac", "flac", "ogg", "oga", "opus", "webm", "amr", "wma", "aiff", "mp4", "m4b"].includes(
    extension ?? ""
  );
}


