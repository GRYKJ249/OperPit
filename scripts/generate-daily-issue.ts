import { generateDailyIssue } from "../server/daily-generation";

const date = new Date().toISOString().slice(0, 10);
try {
  const posts = await generateDailyIssue(date);
  if (posts.length !== 5) throw new Error("daily_issue_incomplete");
  console.log(`Published ${posts.length} daily learning notes for ${date}.`);
  process.exitCode = 0;
} catch (error) {
  const reason = error instanceof Error ? error.message : "generation_failed";
  console.error(`Daily issue generation failed (${reason.slice(0, 100)}).`);
  process.exitCode = 1;
}
