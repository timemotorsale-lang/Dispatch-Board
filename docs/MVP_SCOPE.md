# Time Motor Sales Dispatch Board
## MVP Scope — v0.1.0 Daily Dispatch Board

**Project:** Time Motor Sales Dispatch Board  
**Document:** MVP Scope  
**Version:** v0.1.0  
**Phase:** Phase 0 — Define Before Coding  
**Primary Owner / Dispatcher:** Manager  
**Primary Goal:** Make daily task allocation seamless.

---

## 1. MVP Summary

The MVP is a responsive web app for Time Motor Sales that automatically creates a daily team dispatch board from staff roles, duties, and responsibility templates.

The manager uses the board to oversee daily work, approve or adjust recommended task assignments, and track progress across the dealership. Staff members log into the app themselves, view the full team board, update their own assigned tasks, create their own tasks when needed, and provide status updates throughout the day.

The first version focuses on the dealership's highest-priority operational areas:

1. Inventory management
2. Advertising
3. Marketing
4. Sales

Customer service, documentation, collections workflows, compliance workflows, and deeper dealership administration should be included later, but not built deeply in the MVP.

---

## 2. MVP Product Principle

The MVP should prove one core workflow:

> Every morning, the app automatically generates a usable daily team board, recommends who should handle each task, allows the manager and staff to update work throughout the day, and shows the whole team what is happening in real time.

The app should assist management decisions. It should not replace the manager's judgment.

---

## 3. Recommended Platform Scope

### In Scope

- Responsive web app usable on desktop, tablet, and mobile browsers
- App-like experience on mobile through responsive design
- Future-ready structure for a Progressive Web App

### Out of Scope for MVP

- Native iPhone app
- Native Android app
- Desktop app
- App store deployment

The MVP should be built as a website/web app first. A native mobile app should only be considered after the workflow is proven.

---

## 4. Day-One Roles

The MVP should support these roles:

- General Manager
- Inventory Manager
- Mechanic
- Salesperson
- Office Manager
- Marketing/Advertisement Manager
- Collections

Some roles overlap. The app should not assume that a staff member can only perform one category of work. A user may have multiple roles, custom duties, or responsibility assignments.

### Recommended role model

```text
User -> Role(s) -> Duties -> Task Templates -> Daily Tasks -> Today's Board
```

This allows the app to recommend work based on responsibilities, not just job titles.

---

## 5. User Access and Visibility

### Manager

The manager can:

- View the full team board
- Create tasks
- Edit tasks
- Assign tasks
- Reassign tasks
- Accept or override assignment recommendations
- Create or edit staff duties
- Review work when needed
- Mark review-required tasks as completed
- See the full activity feed

### Staff

Staff can:

- Log into the app themselves
- View the full team board
- View their own assigned tasks
- Update the status of their own tasks
- Add comments or updates to their own tasks
- Create their own tasks
- Mark tasks as blocked, with a required reason
- Move eligible tasks to Ready for Review or Completed, depending on the task settings

### MVP permission rule

Staff can see the full board for transparency, but they should not be able to edit or reassign other staff members' tasks unless the manager grants that ability later.

---

## 6. Daily Board Generation

The MVP must automatically generate the daily board.

### Requirements

- The board generates once per business day at a specific configured time.
- The generation time should be configurable in the app settings.
- The default generation time can be set during implementation.
- Saturday should use the same board rules as weekdays.
- The app should avoid duplicate tasks for the same user, date, and template.
- The manager should be able to manually add one-off tasks at any time.
- The manager should be able to manually trigger generation if the daily board did not generate correctly.

### Generation logic

When the board generates:

1. Check each active user.
2. Check the user's custom duties and responsibilities.
3. Generate daily tasks from those duty templates.
4. If the user has no custom duties, use general default duties based on their role.
5. Assign or recommend assignments based on role and duty matching.
6. Add generated tasks to Today's Board.
7. Record the generation event in Today's Activity Feed.

---

## 7. Duties and Task Templates

The MVP should include duty templates that generate daily tasks.

### Custom Duties

A user may have custom duties assigned directly to them.

Example:

- Walter may have mechanic-related diagnostic and repair update duties.
- A marketing staff member may have photo, listing, and social posting duties.
- A salesperson may have lead follow-up and appointment duties.

### Role Default Duties

If a user does not have custom duties, the app should use general role defaults.

### Example default duty templates

#### Inventory Manager

- Review inventory status
- Check vehicles needing inspection
- Check vehicles waiting for repairs
- Check vehicles waiting for detail
- Check vehicles ready for photos/listing
- Confirm vehicles ready for sale

#### Mechanic

- Review assigned repair or diagnosis tasks
- Update repair status
- Mark waiting on parts when applicable
- Mark waiting on approval when applicable
- Mark work ready for review when finished

#### Marketing/Advertisement Manager

- Check vehicles ready for photos
- Confirm listings are complete
- Update online advertising tasks
- Create or update broad marketing posts
- Flag missing photos or vehicle information

#### Salesperson

- Review sales follow-up tasks
- Follow up with assigned leads
- Confirm appointments
- Update sold or pending vehicle prep status
- Notify manager of hot leads or stalled deals

#### Office Manager

- Review office/admin support tasks
- Flag missing documentation when noticed
- Support sales or inventory tasks when assigned

#### Collections

- Collections role exists in MVP
- Deep collections workflow is deferred
- Basic assigned tasks may be created manually if needed

#### General Manager

- Review today's board
- Review blocked tasks
- Review tasks marked Ready for Review
- Reassign or adjust work as needed
- Monitor Today's Activity Feed

---

## 8. Core Workflow Areas

### 8.1 Inventory Workflow

Inventory management is the highest-priority MVP area.

The broad inventory workflow should be represented as:

```text
Purchased -> Inspection -> Repairs -> Detail -> Photos -> Listing -> Ready for Sale
```

The MVP does not need to be a complete recon system. It only needs to represent this workflow through tasks, broad stages, and board visibility.

### 8.2 Advertising / Marketing / Sales Workflows

These workflows should remain broad in the MVP:

- Photos/Listings
- Marketing Posts
- Lead Follow-Up
- Appointments
- Sold Vehicle Prep

These categories can become more detailed in later versions after real use exposes what is needed.

---

## 9. Task Requirements

Each task should include:

- Title
- Description or notes
- Assigned user
- Recommended user, when applicable
- Role or duty source
- Status
- Due time
- Created by
- Created date/time
- Last updated date/time
- Optional vehicle/customer text
- Optional comments/updates
- Whether manager approval is required before completion

### Due time rule

Every task should have a due time.

The due time can be generated from the task template, selected by the manager, or entered by staff when they create their own task.

### Vehicle/customer rule

Vehicle and customer references should be optional text fields in the MVP.

Do not build a full vehicle database or customer database in the MVP.

Optional vehicle/customer text may include:

- Stock number
- VIN
- Year/make/model
- Color
- Customer name
- Short reference note

---

## 10. Task Statuses

The MVP should use these statuses:

- Not Started
- In Progress
- Blocked
- Waiting on Parts
- Waiting on Approval
- Ready for Review
- Completed

### Blocked rule

If a user marks a task as Blocked, the app must require a blocker reason.

Examples:

- Waiting for parts
- Waiting for manager decision
- Missing vehicle information
- Customer did not respond
- Vehicle not available
- Need approval
- Tool/equipment issue

---

## 11. Completion and Manager Review

Not every task should require manager approval before completion.

The MVP should support a per-task or per-template setting:

```text
Requires Manager Approval: Yes / No
```

### If approval is required

1. Staff marks the task as Ready for Review.
2. Manager reviews the task.
3. Manager marks it Completed or sends it back to In Progress.

### If approval is not required

Staff may mark the task Completed directly.

### Recommended default

Review-required tasks should include important items such as:

- Vehicle ready for sale
- Listing completed
- Photos completed
- Sold vehicle prep completed
- Repair completed
- High-importance manager-created tasks

Routine personal/staff-created tasks may be completed directly unless the manager changes the setting.

---

## 12. Assignment Recommendation

The MVP should recommend who should receive a task.

### Recommendation logic should be simple and explainable

The app should recommend based on:

1. Direct user duty match
2. Role match
3. Task template owner
4. Department/workflow match
5. Manager review if no clear match exists

### Required behavior

- The manager can accept the recommendation.
- The manager can override the recommendation.
- If no match exists, show Manager Review Needed.
- The app should not make final high-stakes decisions automatically.

### Out of scope for MVP

Do not build advanced priority scoring yet.

Deferred logic includes:

- Staff capacity limits
- Complex workload balancing
- Profit-based scoring
- Sales urgency scoring
- Aged inventory scoring
- AI-only automatic final assignment without manager visibility

---

## 13. Today's Activity Feed

Today's Activity Feed must work from day one.

It should show real updates generated by actions inside the app.

### Activity events to log

- Daily board generated
- Task created
- Task assigned
- Assignment recommendation made
- Assignment changed
- Due time changed
- Status changed
- Task marked Blocked
- Blocker reason added
- Task marked Waiting on Parts
- Task marked Waiting on Approval
- Task marked Ready for Review
- Manager approved completion
- Task completed
- Comment/update added

### Activity feed purpose

The feed should help the team quickly understand what is happening during the day without needing to ask everyone for updates.

---

## 14. Relationship to Other Tools

Time Motor Sales currently uses other tools and apps, including dealership management software and Asana.

### MVP position

The MVP should work alongside existing tools. It should not attempt to replace everything immediately.

### Dealership management software

The MVP should not integrate directly with dealership management software yet.

Instead, users may manually type vehicle/customer references into task text fields.

### Asana

The app should be designed with the long-term possibility of replacing Asana for internal dealership task management.

However, the MVP should not attempt a full Asana replacement.

### MVP integration rule

No live third-party integrations should be required in v0.1.0.

The app should be useful even if all outside information is entered manually.

### Future integration candidates

- Dealership management software
- Asana migration or import/export
- Google Workspace
- CRM/lead sources
- Inventory/listing feeds
- Notifications through email or SMS

---

## 15. In Scope for MVP

The MVP includes:

- Responsive web app
- Staff login
- Role-based user profiles
- Multiple roles per user
- Full team board visibility
- Manager dashboard/control
- Staff task dashboard
- Automatic daily board generation
- Configurable generation time
- Duty templates
- Role default duties
- Staff-created tasks
- Manager-created tasks
- Required due time for every task
- Optional vehicle/customer text reference
- Assignment recommendation
- Manager override of recommendations
- Task statuses
- Required blocker reason
- Per-task or per-template manager approval setting
- Ready for Review workflow
- Real Today's Activity Feed
- Duplicate prevention for daily generated tasks

---

## 16. Out of Scope for MVP

The MVP excludes:

- Native iPhone app
- Native Android app
- Payroll
- Timeclock
- HR/disciplinary tracking
- Deep collections workflow
- Deep compliance workflow
- Full documentation workflow
- Full customer service workflow
- Full CRM
- Full repair order system
- Full dealership management system replacement
- Live DealerCenter or DMS integration
- Live Asana integration
- Accounting integration
- Advanced priority scoring
- Staff capacity limits
- Complex analytics/reporting
- Automated AI management decisions without manager review

---

## 17. MVP Success Criteria

The MVP is successful when:

- The daily board automatically generates at the configured time.
- Tasks are generated from user duties and role defaults.
- The manager can quickly see the whole team board.
- Staff can log in and see the full board.
- Staff can update their own tasks.
- Staff can create their own tasks with a required due time.
- The app recommends task assignments based on role/duty matching.
- The manager can override recommendations.
- Blocked tasks require a reason.
- Today's Activity Feed shows real updates from the app.
- Inventory, advertising, marketing, and sales duties can be managed from the board.
- The app makes task allocation feel seamless enough to use daily.

---

## 18. MVP Acceptance Test

The MVP should be considered usable when the manager can start the day by opening the app and seeing:

1. Today's board already generated.
2. Staff listed with their assigned duties.
3. Tasks grouped by user, status, or workflow area.
4. Due times visible for every task.
5. Recommended assignments visible where applicable.
6. Blocked and waiting tasks clearly visible.
7. Ready for Review tasks clearly visible.
8. A live activity feed showing what changed today.

The staff should be able to log in, understand what they need to do, update progress, and create their own needed tasks without manager assistance.

---

## 19. Suggested Next Document

After this MVP scope is approved, the next recommended document is:

```text
ROADMAP.md
```

The roadmap should break this MVP into small milestones for Codex, such as:

- v0.1.0 Project scaffold
- v0.2.0 Core data model
- v0.3.0 User roles and duties
- v0.4.0 Daily board generation
- v0.5.0 Task board and status updates
- v0.6.0 Activity feed
- v0.7.0 Assignment recommendations
- v0.8.0 MVP polish and reliability
