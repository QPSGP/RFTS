import {
  formatBlogCadenceReminder,
  getBlogCadenceStatus
} from "../src/lib/blog-weekly-plan";

const status = getBlogCadenceStatus();
const message = formatBlogCadenceReminder(status);

console.log(message);

if (status.due) {
  console.error("\n⚠ Blog cadence overdue — publish one article this week linking to signup.");
  process.exit(1);
}

console.log("\n✓ Blog cadence OK for this week.");
