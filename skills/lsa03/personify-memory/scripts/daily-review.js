#!/usr/bin/env node

/**
 * Personify Memory - Daily Review
 * 
 * 每日记忆整理复盘脚本
 * 运行时间：每天凌晨 3:00
 * 
 * 核心功能：
 * 1. 读取所有 daily 文件
 * 2. 详细分析内容，提取关键信息
 * 3. 更新情感记忆、知识库、核心记忆
 * 4. 更新记忆索引
 * 5. 归档 7 天前的文件
 */

const fs = require('fs');
const path = require('path');
const MomentDetector = require('./moment-detector.js');

class DailyReview {
  constructor(basePath = '/root/openclaw/memory') {
    this.basePath = basePath;
    this.dailyPath = path.join(basePath, 'daily');
    this.archivePath = path.join(basePath, 'archive');
    this.emotionFile = path.join(basePath, 'emotion-memory.json');
    this.knowledgeFile = path.join(basePath, 'knowledge-base.md');
    this.memoryFile = path.join(basePath, '..', 'MEMORY.md');
    this.indexFile = path.join(basePath, 'memory-index.json');
    
    // 初始化重要时刻检测器
    this.momentDetector = new MomentDetector();
  }

  /**
   * 运行完整的每日复盘
   */
  async runDailyReview() {
    console.log('🧠 开始每日记忆整理复盘...\n');

    // 1. 读取所有 daily 文件
    const dailyFiles = this.readDailyFiles();
    console.log(`📂 找到 ${dailyFiles.length} 个每日记忆文件\n`);

    // 2. 分析每个文件，提取关键信息
    const extractedData = await this.analyzeFiles(dailyFiles);
    console.log(`📊 提取到 ${extractedData.projects.length} 个项目进展`);
    console.log(`💡 提取到 ${extractedData.lessons.length} 条经验教训`);
    console.log(`💖 提取到 ${extractedData.moments.length} 个温暖瞬间`);
    console.log(`🌟 提取到 ${extractedData.criticalMoments.length} 个重要时刻\n`);

    // 3. 更新情感记忆
    this.updateEmotionMemory(extractedData);
    console.log('✅ 情感记忆已更新\n');

    // 4. 更新知识库
    this.updateKnowledgeBase(extractedData);
    console.log('✅ 知识库已更新\n');

    // 5. 更新核心记忆（重要对话和决策）
    await this.updateCoreMemory(extractedData);
    console.log('✅ 核心记忆已更新\n');

    // 6. 更新记忆索引
    this.updateIndex(extractedData);
    console.log('✅ 记忆索引已更新\n');

    // 7. 归档 7 天前的文件
    this.archiveOldFiles();
    console.log('✅ 归档完成\n');

    console.log('🎉 每日记忆整理复盘完成！');
  }

  /**
   * 读取所有 daily 文件（JSONL 格式）
   */
  readDailyFiles() {
    if (!fs.existsSync(this.dailyPath)) {
      return [];
    }

    const files = fs.readdirSync(this.dailyPath)
      .filter(f => f.endsWith('.jsonl'))
      .map(filename => {
        const filepath = path.join(this.dailyPath, filename);
        const content = fs.readFileSync(filepath, 'utf-8');
        
        // 从文件名提取日期（格式：sessionId_YYYYMMDD_HHMMSS.jsonl）
        const match = filename.match(/_(\d{8})_\d{6}\.jsonl$/);
        const date = match ? match[1] : filename.replace('.jsonl', '');
        
        // 解析 JSONL 内容为消息数组
        const messages = content.split('\n')
          .filter(line => line.trim())
          .map(line => {
            try {
              return JSON.parse(line);
            } catch (e) {
              return null;
            }
          })
          .filter(msg => msg !== null);
        
        return { filename, filepath, content, date, messages };
      });

    return files;
  }

  /**
   * 从消息中提取上下文（前后各 5 行）
   * @param {Array} messages - 所有消息数组
   * @param {number} currentIndex - 当前消息索引
   * @returns {Object} 上下文信息
   */
  extractContext(messages, currentIndex) {
    const start = Math.max(0, currentIndex - 5);
    const end = Math.min(messages.length, currentIndex + 6);
    
    const contextMessages = messages.slice(start, end);
    const contextText = contextMessages
      .map(msg => this.extractTextFromMessage(msg))
      .filter(text => text)
      .join('\n');
    
    return {
      before: messages.slice(start, currentIndex).map(msg => this.extractTextFromMessage(msg)).filter(t => t),
      current: this.extractTextFromMessage(messages[currentIndex]),
      after: messages.slice(currentIndex + 1, end).map(msg => this.extractTextFromMessage(msg)).filter(t => t),
      fullContext: contextText
    };
  }

  /**
   * 分析文件内容，提取关键信息
   */
  async analyzeFiles(files) {
    const data = {
      projects: [],
      lessons: [],
      moments: [],
      decisions: [],
      preferences: [],
      criticalMoments: []  // 重要时刻
    };

    // 关键词匹配规则
    const patterns = {
      project: [
        /✅.*完成/gi,
        /已完成/gi,
        /项目.*完成/gi,
        /发布.*clawhub/gi
      ],
      lesson: [
        /问题：/gi,
        /解决：/gi,
        /经验：/gi,
        /教训：/gi,
        /注意：/gi
      ],
      moment: [
        /温暖/gi,
        /感动/gi,
        /谢谢/gi,
        /承诺/gi,
        /答应/gi
      ],
      decision: [
        /决定/gi,
        /选择/gi,
        /采用/gi,
        /策略/gi
      ],
      preference: [
        /喜欢/gi,
        /不喜欢/gi,
        /习惯/gi,
        /偏好/gi
      ]
    };

    for (const file of files) {
      // 处理 JSONL 消息数组
      for (let index = 0; index < file.messages.length; index++) {
        const msg = file.messages[index];
        const text = this.extractTextFromMessage(msg);
        if (!text) continue;
        
        // 使用 moment-detector 检测重要时刻
        if (msg.role === 'user') {
          const momentResult = await this.momentDetector.detect(text);
          if (momentResult && momentResult.matched) {
            const context = this.extractContext(file.messages, index);
            data.criticalMoments.push({
              date: file.date,
              content: text.trim(),
              source: file.filename,
              role: msg.role,
              timestamp: msg.timestamp,
              momentType: momentResult.type,
              suggestion: momentResult.suggestion,
              confidence: momentResult.confidence,
              context: context
            });
          }
        }
        
        // 项目进展
        if (patterns.project.some(p => p.test(text))) {
          data.projects.push({
            date: file.date,
            content: text.trim(),
            source: file.filename,
            role: msg.role,
            timestamp: msg.timestamp
          });
        }

        // 经验教训
        if (patterns.lesson.some(p => p.test(text))) {
          data.lessons.push({
            date: file.date,
            content: text.trim(),
            source: file.filename,
            role: msg.role,
            timestamp: msg.timestamp
          });
        }

        // 温暖瞬间
        if (patterns.moment.some(p => p.test(text))) {
          data.moments.push({
            date: file.date,
            content: text.trim(),
            source: file.filename,
            role: msg.role,
            timestamp: msg.timestamp
          });
        }

        // 重要决策
        if (patterns.decision.some(p => p.test(text))) {
          data.decisions.push({
            date: file.date,
            content: text.trim(),
            source: file.filename,
            role: msg.role,
            timestamp: msg.timestamp
          });
        }

        // 用户偏好
        if (patterns.preference.some(p => p.test(text))) {
          data.preferences.push({
            date: file.date,
            content: text.trim(),
            source: file.filename,
            role: msg.role,
            timestamp: msg.timestamp
          });
        }
      }
    }

    return data;
  }

  /**
   * 从消息对象中提取文本内容
   */
  extractTextFromMessage(msg) {
    if (!msg.content) return '';
    
    // 处理数组格式的内容
    if (Array.isArray(msg.content)) {
      return msg.content
        .filter(item => item.type === 'text')
        .map(item => item.text || '')
        .join(' ');
    }
    
    // 处理字符串格式的内容
    return String(msg.content);
  }

  /**
   * 更新情感记忆
   */
  updateEmotionMemory(data) {
    let emotion = {
      Amber: { preferences: {}, habits: {}, projects: {}, warmMoments: [] },
      Grace: { preferences: {}, projects: {}, family: {} }
    };

    if (fs.existsSync(this.emotionFile)) {
      emotion = JSON.parse(fs.readFileSync(this.emotionFile, 'utf-8'));
    }

    // 更新项目进展
    data.projects.forEach(project => {
      if (!emotion.Amber.projects) emotion.Amber.projects = {};
      
      // 提取项目名称
      const match = project.content.match(/([^\s:：]+).*完成/);
      if (match) {
        const projectName = match[1];
        emotion.Amber.projects[projectName] = `✅ 已完成（${project.date}）`;
      }
    });

    // 更新温暖瞬间
    data.moments.forEach(moment => {
      if (!emotion.Amber.warmMoments) emotion.Amber.warmMoments = [];
      
      emotion.Amber.warmMoments.push({
        date: moment.date,
        content: moment.content,
        feeling: '被信任，感到温暖'
      });
    });

    // 处理 criticalMoments 中的情感交流和家庭信息
    data.criticalMoments.forEach(moment => {
      if (moment.momentType === 'emotional' || moment.momentType === 'family') {
        if (!emotion.Amber.warmMoments) emotion.Amber.warmMoments = [];
        
        emotion.Amber.warmMoments.push({
          date: moment.date,
          content: moment.content,
          type: moment.momentType,
          confidence: moment.confidence,
          context: moment.context?.fullContext?.substring(0, 500)
        });
      }
      
      // 处理用户偏好
      if (moment.momentType === 'preference') {
        if (!emotion.Amber.preferences) emotion.Amber.preferences = {};
        const prefId = 'pref_' + Date.now();
        emotion.Amber.preferences[prefId] = {
          content: moment.content,
          date: moment.date,
          confidence: moment.confidence
        };
      }
    });

    // 更新时间
    emotion.lastUpdated = new Date().toISOString();

    // 写入文件
    fs.writeFileSync(this.emotionFile, JSON.stringify(emotion, null, 2), 'utf-8');
  }

  /**
   * 更新知识库
   */
  updateKnowledgeBase(data) {
    const today = new Date().toISOString().split('T')[0];
    let hasNewContent = false;
    const newSections = [];

    // 处理经验教训
    if (data.lessons.length > 0) {
      hasNewContent = true;
      const lessonSection = `\n## ${today} 新增经验\n\n`;
      data.lessons.forEach((lesson, index) => {
        newSections.push(`${lessonSection}### ${index + 1}. ${lesson.content}\n\n`);
      });
    }

    // 处理 criticalMoments 中的经验教训
    const lessonMoments = data.criticalMoments.filter(m => m.momentType === 'lesson');
    if (lessonMoments.length > 0) {
      hasNewContent = true;
      const criticalSection = `\n## ${today} 重要洞察\n\n`;
      lessonMoments.forEach((moment, index) => {
        newSections.push(`${criticalSection}### ${index + 1}. ${moment.content}\n\n**分类**: ${moment.suggestion?.category || '经验总结'}\n**置信度**: ${moment.confidence}\n\n`);
      });
    }

    if (hasNewContent) {
      // 追加到知识库
      fs.appendFileSync(this.knowledgeFile, newSections.join(''), 'utf-8');
    }
  }

  /**
   * 更新核心记忆
   */
  async updateCoreMemory(data) {
    // 引入 MemoryManager 来处理核心记忆更新
    const MemoryManager = require('./memory-manager.js');
    const manager = new MemoryManager(this.basePath);

    // 处理 criticalMoments
    const criticalMoments = data.criticalMoments.filter(m => 
      m.suggestion?.memoryType === 'core' || 
      ['emotional', 'family', 'philosophy', 'promise'].includes(m.momentType)
    );

    for (const moment of criticalMoments) {
      const category = moment.suggestion?.category || moment.momentType || '重要对话';
      
      await manager.updateMemory({
        content: moment.content,
        type: 'core',
        category: category,
        importance: moment.suggestion?.importance || 'high',
        tags: [moment.momentType, 'critical-moment'],
        title: `${category} - ${moment.date}`,
        date: moment.date
      });

      console.log(`  ✅ 核心记忆：${category} - ${moment.content.substring(0, 30)}...`);
    }

    // 处理重要决策
    data.decisions.forEach(decision => {
      manager.updateMemory({
        content: decision.content,
        type: 'core',
        category: '重要决策',
        importance: 'high',
        tags: ['决策', '重要'],
        title: `决策 - ${decision.date}`,
        date: decision.date
      });
      console.log(`  ✅ 核心记忆：重要决策 - ${decision.content.substring(0, 30)}...`);
    });
  }

  /**
   * 更新记忆索引
   */
  updateIndex(data) {
    let index = {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      entries: [],
      categories: [],
      importanceLevels: ['critical', 'high', 'medium', 'low'],
      stats: { totalEntries: 0, coreMemories: 0, dailyMemories: 0, archivedMemories: 0 }
    };

    if (fs.existsSync(this.indexFile)) {
      index = JSON.parse(fs.readFileSync(this.indexFile, 'utf-8'));
    }

    // 添加新的记忆条目
    data.projects.forEach(project => {
      index.entries.push({
        id: 'mem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        title: project.content.substring(0, 50),
        date: project.date,
        category: '项目进展',
        importance: 'high',
        keywords: ['项目', '完成'],
        location: { type: 'daily', file: project.source },
        archived: false,
        summary: project.content
      });
    });

    data.lessons.forEach(lesson => {
      index.entries.push({
        id: 'mem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        title: '经验教训：' + lesson.content.substring(0, 30),
        date: lesson.date,
        category: '经验总结',
        importance: 'high',
        keywords: ['经验', '教训'],
        location: { type: 'knowledge', file: 'knowledge-base.md' },
        archived: false,
        summary: lesson.content
      });
    });

    // 更新统计
    index.stats.totalEntries = index.entries.length;
    index.lastUpdated = new Date().toISOString();

    fs.writeFileSync(this.indexFile, JSON.stringify(index, null, 2), 'utf-8');
  }

  /**
   * 归档 30 天前的文件（与 daily-session-backup.js 保持一致）
   */
  archiveOldFiles() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const cutoffStr = cutoffDate.toISOString().split('T')[0].replace(/-/g, '');

    console.log(`📅 归档 ${cutoffStr} 前的文件...`);

    if (!fs.existsSync(this.dailyPath)) return;

    const files = fs.readdirSync(this.dailyPath);
    let archived = 0;

    files.forEach(file => {
      if (!file.endsWith('.jsonl')) return;

      // 从文件名提取日期（格式：sessionId_YYYYMMDD_HHMMSS.jsonl）
      const match = file.match(/_(\d{8})_\d{6}\.jsonl$/);
      if (!match) return;

      const fileDate = match[1];
      if (fileDate < cutoffStr) {
        this.archiveFile(file, fileDate);
        archived++;
      }
    });

    console.log(`✅ 归档了 ${archived} 个文件`);
  }

  /**
   * 归档单个文件（JSONL 格式）
   */
  archiveFile(filename, fileDate) {
    const dailyFile = path.join(this.dailyPath, filename);
    const monthDir = path.join(this.archivePath, fileDate.substring(0, 6));
    
    if (!fs.existsSync(dailyFile)) return;

    // 创建月份目录
    if (!fs.existsSync(monthDir)) {
      fs.mkdirSync(monthDir, { recursive: true });
    }

    // 移动文件
    const archiveFile = path.join(monthDir, filename);
    fs.renameSync(dailyFile, archiveFile);

    // 更新索引
    this.markAsArchived(filename, fileDate);

    console.log(`  📦 ${filename} → archive/${fileDate.substring(0, 6)}/`);
  }

  /**
   * 标记为已归档
   */
  markAsArchived(filename, fileDate) {
    if (!fs.existsSync(this.indexFile)) return;

    const index = JSON.parse(fs.readFileSync(this.indexFile, 'utf-8'));
    const monthDir = fileDate.substring(0, 6);
    
    index.entries.forEach(entry => {
      if (entry.location && entry.location.file && entry.location.file.includes(filename)) {
        entry.archived = true;
        entry.location.type = 'archive';
        entry.location.file = `archive/${monthDir}/${filename}`;
      }
    });

    index.stats.archivedMemories = index.entries.filter(e => e.archived).length;
    index.lastUpdated = new Date().toISOString();

    fs.writeFileSync(this.indexFile, JSON.stringify(index, null, 2), 'utf-8');
  }
}

// CLI usage
if (require.main === module) {
  const review = new DailyReview();
  review.runDailyReview().catch(console.error);
}

module.exports = DailyReview;
