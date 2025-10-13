# Database Features Guide

## 🎯 Overview

The CAP Training Scheduler now includes a full database tracking system with:
- **Persistent Storage** - Save schedules permanently
- **Attendance Tracking** - Mark who showed up vs no-shows  
- **Analytics Dashboard** - Week-over-week insights and improvements
- **Historical Data** - View past schedules and agent progress

---

## 🚀 Getting Started

### 1. Generate a Schedule
1. Upload your TSV file with agent data (including Leads Per Day column)
2. Review the generated schedule
3. Click the **"Database & Analytics"** tab at the top

### 2. Save Your Schedule
1. In the Database tab, click **"Save Schedule"** sub-tab
2. Click the green **"Save Schedule to Database"** button
3. Choose the week date (defaults to next Monday)
4. Review the summary and click **"Save to Database"**

✅ **Schedule is now permanently stored!**

---

## 📊 Features

### **Save Schedule Tab**
- **Purpose**: Persist generated schedules to database
- **Prevents**: Duplicate schedules for the same week
- **Saves**: All sessions, agents, CAP scores, lead attainment data

**When to Use**: After generating a schedule you want to track

### **Saved Schedules Tab**
- **View**: All historical schedules by week
- **Actions**: 
  - 👁️ View full schedule details
  - 🗑️ Delete old schedules
- **Shows**: Total agents, sessions, CAP scores for each week

**When to Use**: Browse past schedules or review what was planned

### **Attendance Tab**
- **Purpose**: Mark who attended training sessions
- **Options**:
  - ✅ **Attended** - Agent showed up
  - ❌ **No-Show** - Agent didn't attend (can add reason)
  - ⏳ **Pending** - Not marked yet
- **Bulk Actions**: Save multiple attendance records at once
- **Filters**: By schedule week

**When to Use**: After training sessions to track completion

**Workflow**:
1. Select a schedule week
2. Review list of assignments
3. Click "Attended" or "No-Show" for each agent
4. Optionally add no-show reasons
5. Click "Save All Changes"

### **Analytics Tab**
Comprehensive insights on training effectiveness:

#### **Overall Stats**
- Average completion rate across all weeks
- Total weeks tracked
- Number of agents who improved
- Active managers count

#### **Recent Completion Rates**
- Last 4 weeks of training
- Attended vs no-show breakdown
- Completion percentages

#### **Top Performing Managers**
- Ranked by attendance rate
- Shows agent count and session totals
- Identifies managers with best compliance

#### **Agent Improvements**
- Agents whose CAP scores increased
- Shows: Previous → Current CAP score
- Improvement delta (e.g., +15 points)
- Training type that helped

#### **Training Effectiveness**
- Success rate by training type:
  - Close Rate Training
  - Annual Premium Training
  - Place Rate Training
  - Zero CAP Remediation
- Shows % of agents who improved
- Average improvement amount

**When to Use**: Weekly reviews, manager check-ins, curriculum evaluation

---

## 💡 Use Cases

### **Weekly Operations**
1. **Monday**: Generate and save next week's schedule
2. **Throughout Week**: Track attendance after each session
3. **Friday**: Upload new data, compare CAP scores
4. **Review**: Check analytics to see improvements

### **Manager Reviews**
- Show manager their team's attendance rate
- Compare to other managers (Top Performers)
- Identify agents needing follow-up (no-shows)
- Celebrate improvements (Agent Improvements section)

### **Curriculum Evaluation**
- Review Training Effectiveness chart
- If Close Rate Training has low success → Review curriculum
- If one training type shows high improvement → Expand it
- Identify which metrics respond best to training

### **Agent Development**
- Track individual agent progress over weeks
- See which training types worked for specific agents
- Identify repeat no-shows for 1-on-1 intervention
- Document improvements for performance reviews

---

## 📈 Key Metrics Explained

**Completion Rate**
- % of scheduled agents who attended
- Target: 80%+ (industry standard)
- Lower rates indicate scheduling issues or engagement problems

**Attendance Rate (Manager-Level)**
- % of manager's agents who attend training
- Compares managers' ability to ensure attendance
- Affects team performance

**CAP Improvement**
- Change in Adjusted CAP Score after training
- Positive = training worked
- Negative = may need follow-up or different approach

**Success Rate (Training Type)**
- % of trained agents who improved in that metric
- 70%+ = excellent curriculum
- <50% = review training content

---

## 🔧 Troubleshooting

**"A schedule for this week already exists"**
- ✅ Solution: Delete old schedule first or choose different week
- Why: Prevents accidental overwrites

**"No pending attendance to mark"**
- ✅ All attendance already marked (good!)
- Or: No saved schedules yet (save one first)

**"No analytics data available"**
- ✅ Need multiple weeks of data with marked attendance
- Action: Save schedules and track attendance for 2+ weeks

**Agents not showing in analytics**
- ✅ Attendance must be marked (not pending)
- ✅ Need at least 2 weeks of data to see improvements

---

## 🎓 Best Practices

1. **Save Weekly**: Create habit of saving schedule every week
2. **Mark Same Day**: Track attendance immediately after sessions
3. **Add Notes**: Document no-show reasons (sick, forgot, refused, etc.)
4. **Review Analytics**: Check effectiveness monthly
5. **Celebrate Wins**: Share agent improvements with managers
6. **Iterate**: Adjust training types based on success rates

---

## 🔮 Future Enhancements (Coming Soon)

- 📧 **Email Notifications**: Automated reminders before sessions
- 📱 **Mobile View**: Manager app for attendance on-the-go
- 📊 **Advanced Charts**: Trend lines, forecasting
- 🔄 **Rescheduling**: Move no-shows to future sessions
- 🏆 **Leaderboards**: Gamify improvements
- 💬 **Agent Feedback**: Post-training surveys

---

## 📞 Support

For questions or feature requests, contact the development team or open a GitHub issue.

**Version**: 2.0  
**Last Updated**: January 2025

