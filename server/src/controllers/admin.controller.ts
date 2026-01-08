import type { Request, Response, NextFunction } from 'express';
import { User } from '../models/user.model.js';
import { Paper } from '../models/paper.model.js';
import { Conversation } from '../models/conversation.model.js';
import { redis } from '../config/redis.js';
import type { AuthRequest } from '../middleware/auth.js';

class AdminController {
  /**
   * Get overall system statistics
   */
  async getStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log('📊 Admin: Fetching system statistics...');
      
      const [
        totalUsers,
        totalPapers,
        totalConversations,
        activeUsersLast30Days,
        papersLast30Days,
      ] = await Promise.all([
        User.countDocuments(),
        Paper.countDocuments(),
        Conversation.countDocuments(),
        User.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        }),
        Paper.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        }),
      ]);

      console.log('📊 Admin stats:', {
        totalUsers,
        totalPapers,
        totalConversations,
        activeUsersLast30Days,
        papersLast30Days,
      });

      // Calculate total tokens used across all users
      const tokenStats = await User.aggregate([
        {
          $group: {
            _id: null,
            totalUsed: { $sum: '$tokenUsage.used' },
            totalAllowance: { $sum: '$tokenUsage.allowance' },
            avgUsed: { $avg: '$tokenUsage.used' },
            avgAllowance: { $avg: '$tokenUsage.allowance' },
          },
        },
      ]);

      const tokenData = tokenStats[0] || {
        totalUsed: 0,
        totalAllowance: 0,
        avgUsed: 0,
        avgAllowance: 0,
      };

      res.json({
        status: 'success',
        data: {
          users: {
            total: totalUsers,
            activeLast30Days: activeUsersLast30Days,
          },
          papers: {
            total: totalPapers,
            last30Days: papersLast30Days,
          },
          conversations: {
            total: totalConversations,
          },
          tokens: {
            totalUsed: tokenData.totalUsed,
            totalAllowance: tokenData.totalAllowance,
            averageUsed: Math.round(tokenData.avgUsed),
            averageAllowance: Math.round(tokenData.avgAllowance),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user statistics with time series data
   */
  async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { days = 30 } = req.query;
      const daysNum = Math.min(Number(days), 365); // Max 365 days

      console.log('👥 Admin: Fetching user statistics...');

      // Total users
      const totalUsers = await User.countDocuments();
      console.log('👥 Total users:', totalUsers);

      // Users by registration date (last N days)
      const startDate = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);
      const usersByDate = await User.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);

      // Users by auth provider
      const usersByProvider = await User.aggregate([
        {
          $group: {
            _id: '$authProvider',
            count: { $sum: 1 },
          },
        },
      ]);

      // Verified vs unverified
      const verifiedStats = await User.aggregate([
        {
          $group: {
            _id: '$emailVerified',
            count: { $sum: 1 },
          },
        },
      ]);

      res.json({
        status: 'success',
        data: {
          total: totalUsers,
          growth: usersByDate.map((item) => ({
            date: item._id,
            count: item.count,
          })),
          byProvider: usersByProvider.reduce(
            (acc, item) => {
              acc[item._id || 'local'] = item.count;
              return acc;
            },
            {} as Record<string, number>
          ),
          verified: verifiedStats.reduce(
            (acc, item) => {
              acc[item._id ? 'verified' : 'unverified'] = item.count;
              return acc;
            },
            {} as Record<string, number>
          ),
        },
      });
    } catch (error) {
      console.error('❌ Admin getUsers error:', error);
      next(error);
    }
  }

  /**
   * Get paper statistics with time series data
   */
  async getPapers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { days = 30 } = req.query;
      const daysNum = Math.min(Number(days), 365);

      console.log('📄 Admin: Fetching paper statistics...');

      // Total papers
      const totalPapers = await Paper.countDocuments();
      console.log('📄 Total papers:', totalPapers);

      // Papers by status
      const papersByStatus = await Paper.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]);

      // Papers by date (last N days)
      const startDate = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);
      const papersByDate = await Paper.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);

      // Average file size
      const fileSizeStats = await Paper.aggregate([
        {
          $group: {
            _id: null,
            avgSize: { $avg: '$fileSize' },
            totalSize: { $sum: '$fileSize' },
            maxSize: { $max: '$fileSize' },
            minSize: { $min: '$fileSize' },
          },
        },
      ]);

      const sizeData = fileSizeStats[0] || {
        avgSize: 0,
        totalSize: 0,
        maxSize: 0,
        minSize: 0,
      };

      res.json({
        status: 'success',
        data: {
          total: totalPapers,
          byStatus: papersByStatus.reduce(
            (acc, item) => {
              acc[item._id] = item.count;
              return acc;
            },
            {} as Record<string, number>
          ),
          growth: papersByDate.map((item) => ({
            date: item._id,
            count: item.count,
          })),
          fileSize: {
            average: Math.round(sizeData.avgSize),
            total: sizeData.totalSize,
            max: sizeData.maxSize,
            min: sizeData.minSize,
          },
        },
      });
    } catch (error) {
      console.error('❌ Admin getPapers error:', error);
      next(error);
    }
  }

  /**
   * Get token usage statistics
   */
  async getTokens(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { days = 30 } = req.query;
      const daysNum = Math.min(Number(days), 365);

      console.log('🎫 Admin: Fetching token statistics...');

      // Overall token statistics
      const tokenStats = await User.aggregate([
        {
          $group: {
            _id: null,
            totalUsed: { $sum: '$tokenUsage.used' },
            totalAllowance: { $sum: '$tokenUsage.allowance' },
            avgUsed: { $avg: '$tokenUsage.used' },
            avgAllowance: { $avg: '$tokenUsage.allowance' },
            maxUsed: { $max: '$tokenUsage.used' },
            usersAtLimit: {
              $sum: {
                $cond: [
                  { $gte: ['$tokenUsage.used', '$tokenUsage.allowance'] },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]);

      const stats = tokenStats[0] || {
        totalUsed: 0,
        totalAllowance: 0,
        avgUsed: 0,
        avgAllowance: 0,
        maxUsed: 0,
        usersAtLimit: 0,
      };

      // Top users by token usage
      const topUsers = await User.aggregate([
        {
          $project: {
            email: 1,
            name: 1,
            'tokenUsage.used': 1,
            'tokenUsage.allowance': 1,
            isAdmin: 1,
          },
        },
        {
          $sort: { 'tokenUsage.used': -1 },
        },
        {
          $limit: 10,
        },
      ]);

      // Token usage over time (based on lastResetAt)
      const startDate = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);
      const tokenUsageByDate = await User.aggregate([
        {
          $match: {
            'tokenUsage.lastResetAt': { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$tokenUsage.lastResetAt',
              },
            },
            totalUsed: { $sum: '$tokenUsage.used' },
            userCount: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);

      // Pending token extension requests
      const pendingRequests = await User.countDocuments({
        'tokenUsage.pendingRequest': true,
      });

      res.json({
        status: 'success',
        data: {
          overall: {
            totalUsed: stats.totalUsed,
            totalAllowance: stats.totalAllowance,
            averageUsed: Math.round(stats.avgUsed),
            averageAllowance: Math.round(stats.avgAllowance),
            maxUsed: stats.maxUsed,
            usersAtLimit: stats.usersAtLimit,
            pendingRequests,
          },
          topUsers: topUsers.map((user) => ({
            email: user.email,
            name: user.name,
            used: user.tokenUsage?.used || 0,
            allowance: user.tokenUsage?.allowance || 0,
            isAdmin: user.isAdmin || false,
          })),
          usageOverTime: tokenUsageByDate.map((item) => ({
            date: item._id,
            totalUsed: item.totalUsed,
            userCount: item.userCount,
          })),
        },
      });
    } catch (error) {
      console.error('❌ Admin getTokens error:', error);
      next(error);
    }
  }

  /**
   * Get system health metrics
   */
  async getHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log('🏥 Admin: Checking system health...');
      
      // Database health
      const dbStart = Date.now();
      await User.findOne().lean();
      const dbLatency = Date.now() - dbStart;
      console.log('🏥 Database latency:', dbLatency, 'ms');

      // Redis health
      let redisLatency = 0;
      let redisConnected = false;
      try {
        const redisStart = Date.now();
        await redis.call('PING');
        redisLatency = Date.now() - redisStart;
        redisConnected = true;
      } catch (error) {
        redisConnected = false;
      }

      // System metrics
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();

      // Recent errors (papers with failed status)
      const failedPapers = await Paper.countDocuments({ status: 'failed' });
      const processingPapers = await Paper.countDocuments({
        status: 'processing',
      });

      res.json({
        status: 'success',
        data: {
          database: {
            connected: true,
            latency: dbLatency,
            status: dbLatency < 100 ? 'healthy' : dbLatency < 500 ? 'degraded' : 'unhealthy',
          },
          redis: {
            connected: redisConnected,
            latency: redisLatency,
            status: redisConnected && redisLatency < 10 ? 'healthy' : redisConnected ? 'degraded' : 'unhealthy',
          },
          system: {
            uptime: Math.round(uptime),
            memory: {
              heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
              heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
              rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
            },
          },
          papers: {
            failed: failedPapers,
            processing: processingPapers,
          },
        },
      });
    } catch (error) {
      console.error('❌ Admin getHealth error:', error);
      next(error);
    }
  }
}

export const adminController = new AdminController();

