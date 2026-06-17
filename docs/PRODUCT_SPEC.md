# PRODUCT_SPEC.md

# Time Motor Sales Dispatch Board — Product Specification

## 1. Product Name

**Time Motor Sales Dispatch Board**

## 2. Product Summary

Time Motor Sales Dispatch Board is an internal web app for assigning, recommending, tracking, and managing daily duties across Time Motor Sales.

The app helps the manager allocate work to staff, allows staff to log in and manage their own assigned tasks, and gives the company a live operational view of what is happening throughout the day.

The first version will focus on inventory management, advertising, marketing, and sales. Customer service, documentation, collections, and dealership compliance operations will be included later.

## 3. Primary User

The primary dispatcher is the manager.

The manager needs to:

- See all active work.
- Create and assign tasks.
- Receive recommended staff assignments.
- Monitor staff progress.
- See blocked tasks immediately.
- Track daily execution across the company.
- Reassign work when needed.
- Run the daily operation from one board.

## 4. Staff Users

Staff members should log into the app themselves.

Each staff member should be able to:

- View their assigned duties.
- See what is expected today.
- Update task status.
- Mark tasks as blocked with a required reason.
- Add brief updates when something changes.
- Complete tasks when finished.

## 5. Core Problem

Time Motor Sales has many operational duties spread across inventory, recon, advertising, marketing, sales, customer handling, paperwork, collections, and compliance.

The business needs a simple way to decide:

- What needs to be done today.
- Who should do it.
- What is currently in progress.
- What is blocked.
- What has been completed.
- What needs management attention.

Without a centralized dispatch board, duties can become unclear, delayed, duplicated, or forgotten.

## 6. Product Goal

The goal is to make task allocation seamless.

The app should help the manager quickly assign work, recommend the best available staff member for duties, and allow the team to stay synchronized throughout the day.

## 7. Business Priorities for MVP

The MVP should prioritize these operational areas in this order:

1. Inventory management
2. Advertising
3. Marketing
4. Sales

Later versions should include:

1. Customer service
2. Documentation
3. Collections
4. Dealership compliance operations
5. Other administrative workflows

## 8. Recommended App Type

The first version should be a responsive web app.

It should work well on:

- Desktop computers
- Tablets
- Mobile phones

Later, it can become a Progressive Web App so staff can add it to their phone home screen and use it like an app.

Native iPhone and Android apps should be deferred until the workflow is proven.

## 9. Core MVP Features

### 9.1 Staff Login

Each staff member should have their own login.

The manager should see the full dispatch board.

Staff members should primarily see their own assigned duties and updates relevant to their work.

### 9.2 Staff Roles, Duties, and Responsibilities

Each user should have defined duties and responsibilities.

The system should use those duties to populate their daily work.

If a user does not yet have assigned duties, the system should use general default duties based on their role.

Example role areas may include:

- Manager
- Inventory
- Advertising
- Marketing
- Sales
- Mechanic / Shop
- Lot
- Admin

These roles are starting points only and can be refined later.

### 9.3 Task Creation

The manager should be able to create tasks manually.

Tasks may include:

- Title
- Description
- Assigned staff member
- Recommended staff member
- Status
- Department or role area
- Vehicle reference when applicable
- Customer reference when applicable
- Due date or target time
- Notes and updates

### 9.4 Vehicle and Customer Link

When possible, tasks should be tied to a vehicle and/or customer.

Vehicle references may include:

- Stock number
- VIN
- Year / make / model
- Color
- Customer name if customer-owned
- Internal inventory flag if dealership-owned

This should remain simple in the MVP. The app does not need to replace a full dealer management system.

### 9.5 Assignment Recommendation

The app should recommend who should receive a task.

Early recommendation logic should be simple and explainable:

- Match task type to staff duties.
- Match task type to staff role.
- Avoid assigning everything to one person when another eligible person is available.
- If no clear match exists, mark the task as needing manager review.
- Allow the manager to override the recommendation.

Advanced priority logic should be deferred to a later version.

### 9.6 Task Statuses

The app should use these statuses:

- Not Started
- In Progress
- Blocked
- Waiting on Parts
- Waiting on Approval
- Ready for Review
- Completed

### 9.7 Blocker Reason Required

If a staff member marks a task as **Blocked**, the app must require a reason.

The blocker reason should be visible to the manager and should appear in Today’s Activity Feed.

### 9.8 Today’s Activity Feed

The app should populate a live activity feed from day one.

The feed should show:

- New task created
- Task assigned
- Task reassigned
- Task status changed
- Task blocked
- Waiting on parts
- Waiting on approval
- Ready for review
- Task completed
- Staff added an update

The purpose of the activity feed is to keep the whole operation synchronized throughout the day.

### 9.9 Daily Duty Population

The app should populate daily tasks based on each user’s duties and responsibilities.

If a staff member does not have specific duties assigned, the system should use general duties for their role.

The system should avoid duplicate daily assignments.

The exact daily duty templates can be refined later.

## 10. Non-Goals for MVP

The MVP should not try to be:

- Payroll software
- HR software
- A disciplinary monitoring system
- A full DealerCenter replacement
- A full CRM
- A full repair order system
- A full accounting system
- A full compliance system
- A fully automated AI manager
- A native mobile app at first

The app should assist management, not replace management judgment.

## 11. Important Product Principles

### 11.1 Manager Control

The app can recommend assignments, but the manager remains the final decision maker.

### 11.2 Low-Friction Staff Updates

Staff updates must be quick and simple. If updating the board feels like extra paperwork, staff will avoid it.

### 11.3 Visibility Over Complexity

The first version should make work visible before trying to optimize everything mathematically.

### 11.4 Avoid Overbuilding

The MVP should not become a large dealership operating system immediately. It should start with the daily dispatch workflow and grow from there.

### 11.5 One Clear Owner Per Task

Every task should have one clear responsible person, even if multiple people are involved.

## 12. MVP Success Criteria

The MVP is successful when:

- The manager can create or auto-populate daily duties.
- The app recommends who should handle a task.
- Staff can log in and see their duties.
- Staff can update their own task statuses.
- Blocked work is immediately visible.
- Today’s Activity Feed shows real updates from the team.
- Inventory, advertising, marketing, and sales work can be managed from the board.
- Task allocation feels seamless enough to use every day.

## 13. Open Questions

These decisions still need clarification before or during MVP planning:

1. What exact staff roles should exist on day one?
2. Should staff see only their own tasks, or should they also see the full company board?
3. Should the daily board generate automatically every morning or only when the manager clicks a button?
4. Should every completed task require manager review before it becomes fully completed?
5. What are the first daily duty templates for inventory management?
6. What are the first daily duty templates for advertising?
7. What are the first daily duty templates for marketing?
8. What are the first daily duty templates for sales?
9. Should the system eventually connect with DealerCenter, Asana, Google Workspace, or other tools?
10. What reports should the manager see at the end of each day?

## 14. Initial MVP Boundary

The first usable version should answer one practical question:

**Can Time Motor Sales use this board every morning to allocate work and every afternoon to verify progress?**

If the answer is yes, the MVP is valuable.

## 15. Suggested Next Documents

After this product spec, create:

1. `MVP_SCOPE.md`
2. `ROADMAP.md`
3. `ARCHITECTURE.md`
4. `AGENTS.md`
5. `SETUP.md`
