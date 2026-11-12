import { describe, expect, it } from "vitest";
import {
  accessRequestMessage,
  checkClientId,
  invitationMessage,
} from "@/src/domain/classroom-setup";

const ID = "123456789012-abc123def456ghi789.apps.googleusercontent.com";

describe("checkClientId", () => {
  it("recognizes the shape of a Google OAuth client id", () => {
    expect(checkClientId("  ")).toBe("vacio");
    expect(checkClientId(` ${ID} `)).toBe("valido");
    expect(checkClientId("GOCSPX-secret")).toBe("sospechoso");
    expect(checkClientId("123.apps.googleusercontent.com")).toBe("sospechoso");
  });
});

describe("share messages", () => {
  it("carries the client id to the classmate", () => {
    expect(invitationMessage(` ${ID}\n`)).toContain(ID);
  });

  it("carries the redirect uri to the owner", () => {
    const uri = "https://abcdefghijklmnop.chromiumapp.org/";
    expect(accessRequestMessage(uri)).toContain(uri);
  });
});
