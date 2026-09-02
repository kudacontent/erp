import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { looksLikeAudio } from "./meeting-audio.ts";

describe("looksLikeAudio", () => {
  it("일반적인 오디오 mime 을 받아들인다", () => {
    assert.ok(looksLikeAudio("audio/mpeg", "회의.mp3"));
    assert.ok(looksLikeAudio("audio/webm;codecs=opus", "rec.webm"));
    assert.ok(looksLikeAudio("audio/x-m4a", "회의.m4a"));
  });

  it("브라우저가 mime 을 비워 보내도 확장자로 판단한다", () => {
    // 안드로이드 녹음 앱이나 일부 브라우저는 type 을 빈 문자열로 준다
    assert.ok(looksLikeAudio("", "20260831_회의.m4a"));
    assert.ok(looksLikeAudio("application/octet-stream", "voice.amr"));
  });

  it("화상회의 도구가 만든 mp4/webm 도 받는다 (음성만 뽑아 쓴다)", () => {
    assert.ok(looksLikeAudio("video/mp4", "zoom-recording.mp4"));
  });

  it("오디오가 아닌 파일은 막는다", () => {
    assert.equal(looksLikeAudio("application/pdf", "계약서.pdf"), false);
    assert.equal(looksLikeAudio("image/png", "screenshot.png"), false);
    assert.equal(looksLikeAudio("", "메모.txt"), false);
  });

  it("확장자가 없는 파일도 막는다", () => {
    assert.equal(looksLikeAudio("", "recording"), false);
  });
});
