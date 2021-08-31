### Signing Commits

💡 Please set up commit signing: [See docs here](https://docs.github.com/en/github/authenticating-to-github/managing-commit-signature-verification)

Sign them!

### Set pulls to fast forward only

💡 Please read [this article](https://blog.dnsimple.com/2019/01/two-years-of-squash-merge/) about squash merging

- `git config pull.ff only`
  - Consider setting this globally because it's way better this way

### **Naming Branches**

We want to know who is working on a branch, and what it does. Please use this format:

- `name/short-description`
- Examples:
  - `prestwich/refactor-home`
  - `erinhales/merkle-tests`
  - `pranay/relayer-config`

### **Commit messages**

We want to know what a commit will do and be able to skim the commit list for specific things. Please add a short 1-word tag to the front, and a short sentence that fills in the blank "If applied, this commit will __________"

- Examples:
  - `docs: improve rustdoc on the Relay run function`
  - `feature: add gas escalator configuration to optics-base`
  - `test: add test vector JSON files for the merkle trees`

For large commits, please add a commit body with a longer description, and bullet points describing key changes.

### **PRs**

Please name the PR with a short sentence that fills in the blank "If applied, this PR will _________". To be merged into `main` a PR must pass CI in order to be merged.

Please use the [Github Draft PR](https://github.blog/2019-02-14-introducing-draft-pull-requests/) feature for WIP PRs. When ready for review, assign at least one reviewer from the core team. PRs should be reviewed by at least 1 other person.

PRs should **ALWAYS** be [merged by squashing the branch](https://blog.carbonfive.com/always-squash-and-rebase-your-git-commits/#:~:text=It's%20simple%20%E2%80%93%20before%20you%20merge,Here's%20a%20breakdown.&text=Make%20changes%20as%20needed%20with%20as%20many%20commits%20that%20you%20need%20to.).

### Merging PRs

PRs can be merged once the author says it's ready and one core team-member has signed off on the changes.

Before approving and merging please do the following:

1. Ensure that you feel comfortable with the changes being made
2. If an existing `Request Changes` review exists, ask the reviewer to re-review
3. Pull the branch locally
4. Run the pre-commit script
5. Ensure that the build and tests pass
6. Give an approval
7. Ensure that any issues the PR addresses are properly linked
8. If any changes are needed to local environments (e.g. re-installing the build script, or installing new tooling) please record it in the documentation folder.
9. Resolve conficts by rebasing onto target branch
