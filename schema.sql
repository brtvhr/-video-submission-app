-- 视频作品管理平台 - Supabase 建表 SQL
-- 请在 Supabase 项目的 SQL Editor 中执行此文件

-- 创建视频提交数据表
CREATE TABLE IF NOT EXISTS video_submissions (
    id BIGSERIAL PRIMARY KEY,
    unit TEXT NOT NULL DEFAULT '',          -- 报送单位
    platform TEXT NOT NULL DEFAULT '',      -- 发布平台
    title TEXT NOT NULL DEFAULT '',         -- 视频标题
    link TEXT NOT NULL DEFAULT '',          -- 视频链接
    author TEXT NOT NULL DEFAULT '',        -- 作者
    views BIGINT NOT NULL DEFAULT 0,        -- 播放量
    status TEXT NOT NULL DEFAULT '待审核',   -- 审核状态：待审核/已通过/不通过
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- 提交时间
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()    -- 更新时间
);

-- 创建索引加速查询
CREATE INDEX IF NOT EXISTS idx_video_unit ON video_submissions(unit);
CREATE INDEX IF NOT EXISTS idx_video_platform ON video_submissions(platform);
CREATE INDEX IF NOT EXISTS idx_video_status ON video_submissions(status);
CREATE INDEX IF NOT EXISTS idx_video_created_at ON video_submissions(created_at DESC);

-- 启用 Row Level Security（RLS）
ALTER TABLE video_submissions ENABLE ROW LEVEL SECURITY;

-- 允许匿名访问（因为使用的是 anon key，适合内部工具场景）
DROP POLICY IF EXISTS "Allow anonymous select" ON video_submissions;
CREATE POLICY "Allow anonymous select" ON video_submissions
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anonymous insert" ON video_submissions;
CREATE POLICY "Allow anonymous insert" ON video_submissions
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous update" ON video_submissions;
CREATE POLICY "Allow anonymous update" ON video_submissions
    FOR UPDATE USING (true);

-- 自动更新 updated_at 字段的触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_video_updated_at ON video_submissions;
CREATE TRIGGER trigger_video_updated_at
    BEFORE UPDATE ON video_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
