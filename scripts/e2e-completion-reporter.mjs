export default class E2ECompletionReporter {
  onEnd(result) {
    setTimeout(() => {
      process.exit(result.status === "passed" ? 0 : 1);
    }, 100);
  }
}
