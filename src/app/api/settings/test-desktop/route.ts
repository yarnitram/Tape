import { spawn } from "node:child_process";

/** POST /api/settings/test-desktop — fire a local desktop notification toast. */
export async function POST() {
  const title = "Tape";
  const body = "Desktop notifications are working! 🎉";

  const ps = [
    "Add-Type -AssemblyName System.Windows.Forms;",
    "$n=New-Object System.Windows.Forms.NotifyIcon;",
    "$n.Icon=[System.Drawing.SystemIcons]::Information;",
    `$n.BalloonTipTitle=[char]34+${JSON.stringify(title)}+[char]34;`,
    `$n.BalloonTipText=[char]34+${JSON.stringify(body)}+[char]34;`,
    "$n.Visible=$true;",
    "$n.ShowBalloonTip(8000);",
    "Start-Sleep -Milliseconds 200;",
    "$n.Dispose();",
  ].join(" ");

  const result = await new Promise<{ ok: boolean; stderr: string }>(
    (resolve) => {
      const child = spawn("powershell", ["-NoProfile", "-Command", ps], {
        windowsHide: true,
      });
      let stderr = "";
      child.stderr.on("data", (d: Buffer | string) =>
        (stderr += d.toString())
      );
      child.on("close", (code: number | null) =>
        resolve({ ok: code === 0, stderr })
      );
      child.on("error", (err: Error) =>
        resolve({ ok: false, stderr: err.message })
      );
    }
  );

  if (!result.ok) {
    return Response.json(
      { error: `Desktop notification failed: ${result.stderr}` },
      { status: 500 }
    );
  }

  return Response.json({ ok: true });
}