import re

p = '.github/workflows/auto-label.yml'
s = open(p, encoding='utf-8').read()

old = '''            # Assign reviewers
            if (assignees.size > 0) {
              const assigneesList = Array.from(assignees);
              await github.rest.pulls.requestReviewers({
                owner: context.repo.owner,
                repo: context.repo.repo,
                pull_number: context.payload.pull_request.number,
                reviewers: Array.from(assignees)
              });
              console.log(`Assigned reviewers: ${Array.from(assignees).join(', ')}`);
            } else {
              console.log('No matching assignees found');
            }'''

new = '''            # Filter out PR author (can't request review from author)
            const prAuthor = context.payload.pull_request.user.login;
            const filteredAssignees = Array.from(assignees).filter(a => a !== prAuthor);
            
            # Assign reviewers
            if (filteredAssignees.length > 0) {
              await github.rest.pulls.requestReviewers({
                owner: context.repo.owner,
                repo: context.repo.repo,
                pull_number: context.payload.pull_request.number,
                reviewers: filteredAssignees
              });
              console.log(`Assigned reviewers: ${filteredAssignees.join(', ')}`);
            } else {
              console.log('No matching assignees found (after filtering PR author)');
            }'''

if old not in s:
    print('OLD NOT FOUND')
else:
    s = s.replace(old, new)
    with open(p, 'w', encoding='utf-8', newline='\n') as f:
        f.write(s)
    print('updated')