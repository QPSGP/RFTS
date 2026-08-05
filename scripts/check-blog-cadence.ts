import {
  formatBlogCadenceReminder,
  getBlogCadenceStatus
} from "../src/lib/blog-weekly-plan";

const status = getBlogCadenceStatus();
const message = formatBlogCadenceReminder(status);

console.log(message);

if (status.due) {
  console.error(
    `\n⚠ Blog cadence late - ${status.publishedThisWeek}/${status.target} this week (expected ≥${status.expectedByToday}). Publish more articles linking to signup.`
  );
  process.exit(1);
}

console.log(
  `\n✓ Blog cadence OK - ${status.publishedThisWeek}/${status.target} this week.`
);
