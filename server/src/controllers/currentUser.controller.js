import { Manager } from "../models/manager.model.js";
import { Worker } from "../models/worker.models.js";
import Lead from "../models/lead.model.js";
import { Campaign } from "../models/campaign.model.js";
import { Notification } from "../models/notification.model.js";
import Conversation from "../models/conversation.model.js";

export const userName = async (req, res) => {
  try {
    const { _id, role } = req.user;

    let user = null;

    if (role === "manager") {
      user = await Manager.findById(_id).select("name email");
    } else if (role === "worker") {
      user = await Worker.findById(_id).select("name email");
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: "User not found",
        },
      });
    }

    res.status(200).json({
      success: true,
      response: {
        message: "Current user retrieved successfully",
      },
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role,
      },
    });
  } catch (err) {
    console.error("Error retrieving current user:", err);
    res.status(500).json({
      success: false,
      error: {
        message: "Internal Server Error",
      },
    });
  }
};

export const getDashboardData = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    const userId = req.user._id;
    const isManager = req.user.role === "manager";
    const filter = isManager ? {} : { assignedTo: userId };
    // date fiter
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Set end date to end of the day
    const dateFilter = startDate && endDate
  ? { createdAt: { $gte: start, $lte: end } }
  : {};
    // Total leads
    const totalLeads = await Lead.countDocuments({
      ...filter,
      isDeleted: false,
      ...dateFilter,      // datefilter
    });

    // Engaged leads (
    const engagedLeads = await Lead.countDocuments({
      ...filter,
      isDeleted: false,
      ...dateFilter,    // date filter
      conversations: { $exists: true, $not: { $size: 0 } },
    });

    // Conversation rate
    const conversationRate = totalLeads
      ? ((engagedLeads / totalLeads) * 100).toFixed(2)
      : 0;

    // Overdue follow-ups
    const today = new Date();
    const overdueTasks = await Lead.countDocuments({
      ...filter,
      isDeleted: false,
      followUpDates: { $elemMatch: { $lt: today.toISOString() } },
    });

    // Leads in last 7 days
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    const recentLeads = await Lead.find({
      ...filter,
      isDeleted: false,
      createdAt: { $gte: last7Days },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const recentLeadsCount = recentLeads.length;

    // Recent notifications
    const recentNotifications = await Notification.find({
      recipient: userId,
      recipientType: req.user.role,
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Leads by category for pie chart
    const leadsByCategory = await Lead.aggregate([
      {
        $match: {
          ...filter,
          isDeleted: false,
           ...dateFilter,   // date filter
        },
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "categoryInfo",
        },
      },
      {
        $unwind: "$categoryInfo", // Flatten the array to access fields directly
      },
      {
        $project: {
          _id: 0,
          category: "$categoryInfo.title",
          count: 1,
        },
      },
    ]);

    // console.log("Leads by Category:", leadsByCategory);

    // Campaign performance
    const campaignPerformance = await Campaign.aggregate([
      {
        $match: {
          ...(isManager && { createdBy: userId }), // filter by manager if needed
          ...dateFilter,
        },
      },
      {
        $lookup: {
          from: "leads",
          localField: "sentTo",
          foreignField: "_id",
          as: "leads",
        },
      },
      {
        $addFields: {
          targetLeads: { $size: "$leads" },
          convertedLeads: {
            $size: {
              $filter: {
                input: "$leads",
                as: "lead",
                cond: { $gt: [{ $size: "$$lead.conversations" }, 0] },
              },
            },
          },
        },
      },
      {
        $addFields: {
          conversionRate: {
            $cond: [
              { $eq: ["$targetLeads", 0] },
              0,
              {
                $round: [
                  {
                    $multiply: [
                      { $divide: ["$convertedLeads", "$targetLeads"] },
                      100,
                    ],
                  },
                  2,
                ],
              },
            ],
          },
        },
      },
      {
        $project: {
          _id: 0,
          title: 1,
          targetLeads: 1,
          convertedLeads: 1,
          conversionRate: 1,
        },
      },
    ]);

    // Upcoming deadlines
    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);
    const upcomingDeadlines = await Lead.find({
      ...filter,
      isDeleted: false,
      followUpDates: {
        $elemMatch: {
          $gte: today.toISOString(),
          $lte: next7Days.toISOString(),
        },
      },
    })
      .sort({ followUpDates: 1 })
      .limit(10)
      .lean();
    console.log("Upcoming Deadlines:", upcomingDeadlines);


    // Get All Workers with their performance
const workers = await Worker.find().select("_id name").lean();

const leaderboardData = await Promise.all(
  workers.map(async (worker) => {
    const totalAssignedLeads = await Lead.countDocuments({
      assignedTo: worker._id,
      isDeleted: false,
      ...dateFilter,
    });

    const profitableConversations = await Conversation.countDocuments({
      addedBy: worker._id,
      isDeleted: false,
      isProfitable: true,
      ...dateFilter,
    });

    const convertedPercentage = totalAssignedLeads
      ? ((profitableConversations / totalAssignedLeads) * 100).toFixed(2)
      : 0;

    return {
      workerId: worker._id,
      name: worker.name,
      totalAssignedLeads,
      profitableConversations,
      convertedPercentage: parseFloat(convertedPercentage),
    };
  })
);

// Sort by converted percentage descending
const sortedLeaderboard = leaderboardData.sort(
  (a, b) => b.convertedPercentage - a.convertedPercentage
);


    // -----------------------
    // BUSINESS INSIGHTS START
    // -----------------------

     // Lead Velocity Rate
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);
    const weekBeforeLast = new Date();
    weekBeforeLast.setDate(today.getDate() - 14);

    const leadsLast7Days = await Lead.countDocuments({
      ...filter,
      isDeleted: false,
      ...dateFilter,  // date fikter
      createdAt: { $gte: lastWeek },
    });

    const leadsPrev7Days = await Lead.countDocuments({
      ...filter,
      isDeleted: false,
      createdAt: { $gte: weekBeforeLast, $lt: lastWeek },
    });

    const leadVelocityRate = leadsPrev7Days
      ? (((leadsLast7Days - leadsPrev7Days) / leadsPrev7Days) * 100).toFixed(2)
      : leadsLast7Days > 0
      ? "100.00"
      : "0.00";

 // Average Lead Response Time
   const responseTimes = await Lead.aggregate([
  {
    $match: {
      ...filter,
      isDeleted: false,
      ...dateFilter,               // date filter
      lastContact: { $exists: true },
    },
  },
  {
    $project: {
      responseTimeInHours: {
        $divide: [{ $subtract: ["$lastContact", "$createdAt"] }, 1000 * 60 * 60],
      },
    },
  },
  {
    $group: {
      _id: null,
      avgResponseTime: { $avg: "$responseTimeInHours" },
    },
  },
]);

const averageLeadResponseTime =
  responseTimes[0]?.avgResponseTime?.toFixed(2) || "0";


        // Top Converting Campaign
    const campaigns = await Campaign.find({ delivered: { $gt: 0 } })
  .select("title delivered opened")
  .lean();

const campaignPerfo = campaigns.map((camp) => {
  const openRate = ((camp.opened / camp.delivered) * 100).toFixed(2);
  return {
    title: camp.title,
    delivered: camp.delivered,
    opened: camp.opened,
    openRate: parseFloat(openRate),
  };
});

const topConvertingCampaign = campaignPerfo.length
  ? campaignPerfo.reduce((prev, curr) =>
      curr.openRate > prev.openRate ? curr : prev
    )
  : { title: "N/A", openRate: 0 };


       // Most Engaged Worker
    const mostEngagedWorker = sortedLeaderboard.length ? sortedLeaderboard[0] : null;

        // Top Lead Source
   const topLeadSourceData = await Lead.aggregate([
  { $match: { ...filter, isDeleted: false,...dateFilter, leadSource: { $exists: true, $ne: "" } } },
  { $group: { _id: "$leadSource", count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 1 },
]);

const topLeadSource = topLeadSourceData[0]?._id || "N/A";

    
    // Average Sales Cycle Duration
    const salesCycleDurations = await Lead.aggregate([
  {
    $match: {
      ...filter,
      isDeleted: false,
      lastContact: { $exists: true },
      ...dateFilter,   // date filter
    },
  },
  {
    $project: {
      cycleDurationInDays: {
        $divide: [{ $subtract: ["$lastContact", "$createdAt"] }, 1000 * 60 * 60 * 24],
      },
    },
  },
  {
    $group: {
      _id: null,
      avgCycleDuration: { $avg: "$cycleDurationInDays" },
    },
  },
]);

const averageSalesCycleDuration =
  salesCycleDurations[0]?.avgCycleDuration?.toFixed(2) || "0";


        // Highest Performing Category
    const highestPerformingCategory = leadsByCategory.length
      ? leadsByCategory.reduce((prev, curr) => (curr.count > prev.count ? curr : prev))
      : null;

   


     // ---------------------
    // BUSINESS INSIGHTS END
    // ---------------------


    // lead pipeline
const pipelineStatuses = ["new", "in-progress", "follow-up", "closed"];

const leadPipelineCounts = await Lead.aggregate([
  {
    $match: {
      ...filter,
      isDeleted: false,
      ...dateFilter,
      status: { $in: pipelineStatuses },
    },
  },
  {
    $group: {
      _id: "$status",
      count: { $sum: 1 },
    },
  },
]);

// Map the result to always include all statuses with 0 fallback
const leadPipeline = pipelineStatuses.map((status) => {
  const found = leadPipelineCounts.find((item) => item._id === status);
  return { status, count: found ? found.count : 0 };
});




    res.status(200).json({
      success: true,
      totalLeads,
      engagedLeads,
      conversationRate,
      overdueTasks,
      recentLeadsCount,
      recentLeads,
      recentNotifications,
      leadsByCategory,
      campaignPerformance,
      upcomingDeadlines,
      teamLeaderboard: sortedLeaderboard,
        businessInsights: {
        leadVelocityRate,
        averageLeadResponseTime,
        topConvertingCampaign,
        mostEngagedWorker,
        topLeadSource,
        averageSalesCycleDuration,
        highestPerformingCategory,
      },
      leadPipeline,
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching dashboard data",
    });
  }
};
