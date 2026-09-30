/**
 * 视频作品管理平台 - 主应用逻辑
 */

// ========== 默认数据 ==========
const DEFAULT_UNITS = [
    '抖音', '快手', '微博', '百度', '微信', '小红书',
    'BRTV', '东城区', '西城区', '朝阳区', '海淀区', '丰台区',
    '石景山区', '门头沟区', '房山区', '通州区', '顺义区',
    '昌平区', '大兴区', '平谷区', '怀柔区', '密云区', '延庆区', '经开区'
];

const DEFAULT_PLATFORMS = ['抖音', '快手', '微博', '百度', '微信', '小红书'];

// ========== 全局状态 ==========
let supabase = null;
let allSubmissions = [];
let reviewAuthenticated = false;
let parsedBatchItems = [];

// ========== 初始化 ==========
async function initApp() {
    // 检查配置
    if (typeof APP_CONFIG === 'undefined' || !APP_CONFIG.supabaseUrl || APP_CONFIG.supabaseUrl === 'YOUR_SUPABASE_URL') {
        document.getElementById('configBanner').style.display = 'block';
        return;
    }

    // 初始化 Supabase
    try {
        if (typeof supabase === 'undefined' || !window.supabase) {
            showToast('正在加载数据库连接...', 'error');
            return;
        }
        supabase = window.supabase.createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseKey);
    } catch (e) {
        console.error('Supabase init error:', e);
        showToast('数据库连接失败，请检查配置', 'error');
        return;
    }

    // 填充下拉选项
    populateSelect('submitUnit', getUnits(), '请选择');
    populateSelect('submitPlatform', getPlatforms(), '请选择');
    populateSelect('filterUnit', getUnits(), '全部单位');
    populateSelect('filterPlatform', getPlatforms(), '全部平台');
    populateSelect('exportUnit', getUnits(), '全部单位');
    populateSelect('exportPlatform', getPlatforms(), '全部平台');

    // 绑定事件
    bindEvents();

    // 检查审核登录状态
    if (localStorage.getItem('review_auth') === 'true') {
        reviewAuthenticated = true;
        document.getElementById('reviewAuth').style.display = 'none';
        document.getElementById('reviewPanel').style.display = 'block';
    }

    // 加载最近提交
    loadRecentSubmissions();
}

function getUnits() {
    return (APP_CONFIG.units && APP_CONFIG.units.length > 0) ? APP_CONFIG.units : DEFAULT_UNITS;
}

function getPlatforms() {
    return (APP_CONFIG.platforms && APP_CONFIG.platforms.length > 0) ? APP_CONFIG.platforms : DEFAULT_PLATFORMS;
}

function getAccessCode() {
    return APP_CONFIG.accessCode || '';
}

// ========== 下拉选项填充 ==========
function populateSelect(id, options, placeholder) {
    const select = document.getElementById(id);
    if (!select) return;
    select.innerHTML = `<option value="">${placeholder}</option>`;
    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        select.appendChild(option);
    });
}

// ========== 事件绑定 ==========
function bindEvents() {
    // 底部导航
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => switchPage(btn.dataset.page));
    });

    // 提交表单
    document.getElementById('submitForm').addEventListener('submit', handleSubmit);

    // 批量粘贴
    document.getElementById('batchToggle').addEventListener('click', toggleBatch);
    document.getElementById('parseBtn').addEventListener('click', handleParse);

    // 审核 - 访问码
    document.getElementById('reviewAuthBtn').addEventListener('click', handleReviewAuth);
    document.getElementById('reviewPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleReviewAuth();
    });

    // 审核 - 筛选
    document.getElementById('filterUnit').addEventListener('change', loadReviewList);
    document.getElementById('filterPlatform').addEventListener('change', loadReviewList);
    document.querySelectorAll('.status-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.status-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadReviewList();
        });
    });

    // 导出
    document.getElementById('exportUnit').addEventListener('change', updateExportPreview);
    document.getElementById('exportPlatform').addEventListener('change', updateExportPreview);
    document.querySelectorAll('.export-status-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.export-status-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            updateExportPreview();
        });
    });
    document.getElementById('selectAllExport').addEventListener('change', (e) => {
        document.querySelectorAll('.export-checkbox').forEach(cb => cb.checked = e.target.checked);
        updateExportCount();
    });
    document.getElementById('copyExportBtn').addEventListener('click', handleCopyText);
    document.getElementById('copyCsvBtn').addEventListener('click', handleCopyCSV);

    // 弹窗
    document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
    document.querySelector('.modal-backdrop').addEventListener('click', closeModal);
}

// ========== 页面切换 ==========
function switchPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`.nav-item[data-page="${pageId}"]`).classList.add('active');

    // 切换时加载数据
    if (pageId === 'reviewPage' && reviewAuthenticated) {
        loadReviewList();
    } else if (pageId === 'exportPage') {
        updateExportPreview();
    } else if (pageId === 'submitPage') {
        loadRecentSubmissions();
    }

    // 滚动到顶部
    window.scrollTo(0, 0);
}

// ========== 提交功能 ==========
async function handleSubmit(e) {
    e.preventDefault();
    showLoading(true);

    const data = {
        unit: document.getElementById('submitUnit').value,
        platform: document.getElementById('submitPlatform').value,
        title: document.getElementById('submitTitle').value.trim(),
        link: document.getElementById('submitLink').value.trim(),
        author: document.getElementById('submitAuthor').value.trim(),
        views: parseInt(document.getElementById('submitViews').value) || 0,
        status: '待审核',
        created_at: new Date().toISOString()
    };

    if (!data.unit || !data.platform || !data.title || !data.link) {
        showToast('请填写必填项', 'error');
        showLoading(false);
        return;
    }

    try {
        const { error } = await supabase.from('video_submissions').insert([data]);
        if (error) throw error;

        showToast('提交成功！', 'success');
        document.getElementById('submitForm').reset();
        loadRecentSubmissions();
    } catch (err) {
        console.error('Submit error:', err);
        showToast('提交失败: ' + err.message, 'error');
    }

    showLoading(false);
}

async function loadRecentSubmissions() {
    try {
        const { data, error } = await supabase
            .from('video_submissions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;

        allSubmissions = data || [];
        const list = document.getElementById('recentList');
        const count = document.getElementById('recentCount');
        count.textContent = allSubmissions.length;

        if (allSubmissions.length === 0) {
            list.innerHTML = '<div class="empty-state">暂无提交记录</div>';
            return;
        }

        list.innerHTML = allSubmissions.map(item => renderSubmissionCard(item, 'recent')).join('');
    } catch (err) {
        console.error('Load recent error:', err);
    }
}

// ========== 批量粘贴解析 ==========
function toggleBatch() {
    const section = document.getElementById('batchSection');
    const icon = document.getElementById('batchIcon');
    if (section.style.display === 'none') {
        section.style.display = 'block';
        icon.classList.add('expanded');
    } else {
        section.style.display = 'none';
        icon.classList.remove('expanded');
    }
}

function handleParse() {
    const text = document.getElementById('batchText').value.trim();
    if (!text) {
        showToast('请先粘贴文本', 'error');
        return;
    }

    parsedBatchItems = parseText(text);
    const preview = document.getElementById('parsePreview');

    if (parsedBatchItems.length === 0) {
        preview.innerHTML = '<div class="empty-state">未能解析出有效数据，请检查格式</div>';
        preview.style.display = 'block';
        return;
    }

    let html = parsedBatchItems.map((item, idx) => `
        <div class="parse-item">
            <div><span class="parse-field">报送单位：</span>${item.unit || '-'}</div>
            <div><span class="parse-field">平台：</span>${item.platform || '-'}</div>
            <div><span class="parse-field">标题：</span>${item.title || '-'}</div>
            <div><span class="parse-field">链接：</span>${item.link || '-'}</div>
            <div><span class="parse-field">作者：</span>${item.author || '-'}</div>
            <div><span class="parse-field">播放量：</span>${item.views || '-'}</div>
        </div>
    `).join('');

    html += `<div class="parse-actions">
        <button class="btn btn-primary btn-sm" onclick="submitBatch()">提交全部 (${parsedBatchItems.length}条)</button>
    </div>`;

    preview.innerHTML = html;
    preview.style.display = 'block';
}

async function submitBatch() {
    if (parsedBatchItems.length === 0) return;

    showLoading(true);
    const records = parsedBatchItems.map(item => ({
        unit: item.unit || '未知',
        platform: item.platform || '未知',
        title: item.title || '',
        link: item.link || '',
        author: item.author || '',
        views: parseInt(item.views) || 0,
        status: '待审核',
        created_at: new Date().toISOString()
    }));

    try {
        const { error } = await supabase.from('video_submissions').insert(records);
        if (error) throw error;

        showToast(`成功提交 ${records.length} 条记录！`, 'success');
        document.getElementById('batchText').value = '';
        document.getElementById('parsePreview').style.display = 'none';
        parsedBatchItems = [];
        loadRecentSubmissions();
    } catch (err) {
        console.error('Batch submit error:', err);
        showToast('批量提交失败: ' + err.message, 'error');
    }

    showLoading(false);
}

// ========== 文本智能解析 ==========
function parseText(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const items = [];

    // 策略1：尝试按分隔符拆分每行
    const separator = detectSeparator(lines);
    if (separator) {
        for (const line of lines) {
            const fields = line.split(separator).map(f => f.trim()).filter(f => f);
            if (fields.length >= 2) {
                items.push(mapFieldsToRecord(fields));
            }
        }
        if (items.length > 0) return items;
    }

    // 策略2：尝试键值对解析
    const kvItems = parseKeyValueBlocks(lines);
    if (kvItems.length > 0) return kvItems;

    // 策略3：如果只有一行，尝试解析为单条记录
    if (lines.length === 1) {
        const fields = lines[0].split(/[\t,，;；|]/).map(f => f.trim()).filter(f => f);
        if (fields.length >= 2) {
            return [mapFieldsToRecord(fields)];
        }
    }

    return items;
}

function detectSeparator(lines) {
    const separators = ['\t', '|', ',', '，', ';', '；'];
    let bestSep = null;
    let bestCount = 0;

    for (const sep of separators) {
        const counts = lines.slice(0, 5).map(l => l.split(sep).length);
        const consistent = counts.filter(c => c >= 3);
        if (consistent.length > bestCount) {
            bestCount = consistent.length;
            bestSep = sep;
        }
    }

    return bestCount >= 2 ? bestSep : null;
}

function mapFieldsToRecord(fields) {
    const units = getUnits();
    const platforms = getPlatforms();

    const record = {
        unit: '',
        platform: '',
        title: '',
        link: '',
        author: '',
        views: 0
    };

    for (const field of fields) {
        if (!record.unit && units.includes(field)) {
            record.unit = field;
        } else if (!record.platform && platforms.includes(field)) {
            record.platform = field;
        } else if (!record.link && /^https?:\/\//i.test(field)) {
            record.link = field;
        } else if (!record.views && /^\d+$/.test(field) && parseInt(field) > 100) {
            record.views = parseInt(field);
        } else if (!record.title && field.length > 2 && field.length < 100 && !/^https?:\/\//i.test(field)) {
            record.title = field;
        } else if (!record.author && field.length > 0 && field.length < 30) {
            record.author = field;
        }
    }

    return record;
}

function parseKeyValueBlocks(lines) {
    const items = [];
    let current = {};

    const kvRegex = /^(报送单位|发布平台|平台|标题|链接|作者|播放量)\s*[:：]\s*(.+)$/;

    for (const line of lines) {
        const match = line.match(kvRegex);
        if (match) {
            const key = match[1];
            const value = match[2].trim();

            if (key === '报送单位' && current.title) {
                items.push(normalizeRecord(current));
                current = {};
            }

            switch (key) {
                case '报送单位': current.unit = value; break;
                case '发布平台':
                case '平台': current.platform = value; break;
                case '标题': current.title = value; break;
                case '链接': current.link = value; break;
                case '作者': current.author = value; break;
                case '播放量': current.views = value; break;
            }
        }
    }

    if (current.title) {
        items.push(normalizeRecord(current));
    }

    return items;
}

function normalizeRecord(record) {
    return {
        unit: record.unit || '',
        platform: record.platform || '',
        title: record.title || '',
        link: record.link || '',
        author: record.author || '',
        views: parseInt(record.views) || 0
    };
}

// ========== 审核功能 ==========
function handleReviewAuth() {
    const password = document.getElementById('reviewPassword').value;
    const code = getAccessCode();

    if (!code) {
        showToast('系统未设置审核访问码', 'error');
        return;
    }

    if (password === code) {
        reviewAuthenticated = true;
        localStorage.setItem('review_auth', 'true');
        document.getElementById('reviewAuth').style.display = 'none';
        document.getElementById('reviewPanel').style.display = 'block';
        loadReviewList();
    } else {
        showToast('访问码错误', 'error');
    }
}

async function loadReviewList() {
    const unit = document.getElementById('filterUnit').value;
    const platform = document.getElementById('filterPlatform').value;
    const statusEl = document.querySelector('.status-tab.active');
    const status = statusEl ? statusEl.dataset.status : '';

    let query = supabase
        .from('video_submissions')
        .select('*')
        .order('created_at', { ascending: false });

    if (unit) query = query.eq('unit', unit);
    if (platform) query = query.eq('platform', platform);
    if (status) query = query.eq('status', status);

    try {
        const { data, error } = await query;
        if (error) throw error;

        allSubmissions = data || [];

        // 更新统计
        document.getElementById('totalCount').textContent = allSubmissions.length;
        document.getElementById('pendingCount').textContent = allSubmissions.filter(i => i.status === '待审核').length;
        document.getElementById('passedCount').textContent = allSubmissions.filter(i => i.status === '已通过').length;

        const list = document.getElementById('reviewList');
        if (allSubmissions.length === 0) {
            list.innerHTML = '<div class="empty-state">没有符合条件的记录</div>';
            return;
        }

        list.innerHTML = allSubmissions.map(item => renderSubmissionCard(item, 'review')).join('');
    } catch (err) {
        console.error('Load review error:', err);
        showToast('加载失败: ' + err.message, 'error');
    }
}

async function updateReviewStatus(id, newStatus) {
    showLoading(true);
    try {
        const { error } = await supabase
            .from('video_submissions')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) throw error;
        showToast(`已标记为「${newStatus}」`, 'success');
        loadReviewList();
    } catch (err) {
        console.error('Update status error:', err);
        showToast('更新失败: ' + err.message, 'error');
    }
    showLoading(false);
}

// ========== 导出功能 ==========
async function updateExportPreview() {
    const unit = document.getElementById('exportUnit').value;
    const platform = document.getElementById('exportPlatform').value;
    const statusEl = document.querySelector('.export-status-tab.active');
    const status = statusEl ? statusEl.dataset.status : '';

    let query = supabase
        .from('video_submissions')
        .select('*')
        .order('created_at', { ascending: false });

    if (unit) query = query.eq('unit', unit);
    if (platform) query = query.eq('platform', platform);
    if (status) query = query.eq('status', status);

    try {
        const { data, error } = await query;
        if (error) throw error;

        const items = data || [];
        const preview = document.getElementById('exportPreview');

        if (items.length === 0) {
            preview.innerHTML = '<div class="empty-state">没有符合条件的记录</div>';
            document.getElementById('exportCount').textContent = '0 条';
            return;
        }

        // 渲染可勾选的预览列表
        preview.innerHTML = items.map((item, idx) => {
            const text = formatSingleRecord(item);
            return `<div class="mb-8" style="border-bottom:1px solid var(--gray-100);padding-bottom:8px;">
                <label class="checkbox-label" style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;">
                    <input type="checkbox" class="export-checkbox" data-idx="${idx}" checked style="margin-top:4px;flex-shrink:0;">
                    <span style="flex:1;white-space:pre-wrap;word-break:break-all;font-size:13px;line-height:1.6;">${escapeHtml(text)}</span>
                </label>
            </div>`;
        }).join('');

        // 绑定 checkbox 事件
        document.querySelectorAll('.export-checkbox').forEach(cb => {
            cb.addEventListener('change', updateExportCount);
        });

        document.getElementById('exportCount').textContent = `${items.length} 条`;

        // 保存数据供复制使用
        window._exportItems = items;
    } catch (err) {
        console.error('Export preview error:', err);
    }
}

function updateExportCount() {
    const checked = document.querySelectorAll('.export-checkbox:checked').length;
    document.getElementById('exportCount').textContent = `${checked} 条`;
}

function formatSingleRecord(item) {
    return `报送单位：${item.unit}
发布平台：${item.platform}
标题：${item.title}
链接：${item.link}
作者：${item.author || '-'}
播放量：${formatNumber(item.views)}`;
}

async function handleCopyText() {
    if (!window._exportItems || window._exportItems.length === 0) {
        showToast('没有可导出的数据', 'error');
        return;
    }

    const checkboxes = document.querySelectorAll('.export-checkbox:checked');
    const selectedIndices = Array.from(checkboxes).map(cb => parseInt(cb.dataset.idx));

    if (selectedIndices.length === 0) {
        showToast('请至少选择一条记录', 'error');
        return;
    }

    const texts = selectedIndices.map(idx => formatSingleRecord(window._exportItems[idx]));
    const fullText = texts.join('\n\n---\n\n');

    try {
        await copyToClipboard(fullText);
        showToast(`已复制 ${selectedIndices.length} 条记录`, 'success');
    } catch (err) {
        showToast('复制失败，请手动选择复制', 'error');
    }
}

async function handleCopyCSV() {
    if (!window._exportItems || window._exportItems.length === 0) {
        showToast('没有可导出的数据', 'error');
        return;
    }

    const checkboxes = document.querySelectorAll('.export-checkbox:checked');
    const selectedIndices = Array.from(checkboxes).map(cb => parseInt(cb.dataset.idx));

    if (selectedIndices.length === 0) {
        showToast('请至少选择一条记录', 'error');
        return;
    }

    // 表头
    const header = '报送单位\t发布平台\t标题\t链接\t作者\t播放量';
    const rows = selectedIndices.map(idx => {
        const item = window._exportItems[idx];
        return `${item.unit}\t${item.platform}\t${item.title}\t${item.link}\t${item.author || '-'}\t${formatNumber(item.views)}`;
    });

    const csvText = [header, ...rows].join('\n');

    try {
        await copyToClipboard(csvText);
        showToast(`已复制 ${selectedIndices.length} 条表格数据`, 'success');
    } catch (err) {
        showToast('复制失败，请手动选择复制', 'error');
    }
}

// ========== 详情弹窗 ==========
function showDetail(id) {
    const item = allSubmissions.find(s => s.id === id);
    if (!item) return;

    const body = document.getElementById('detailBody');
    const footer = document.getElementById('detailFooter');

    body.innerHTML = `
        <div class="detail-field">
            <div class="detail-label">报送单位</div>
            <div class="detail-value">${escapeHtml(item.unit)}</div>
        </div>
        <div class="detail-field">
            <div class="detail-label">发布平台</div>
            <div class="detail-value">${escapeHtml(item.platform)}</div>
        </div>
        <div class="detail-field">
            <div class="detail-label">标题</div>
            <div class="detail-value">${escapeHtml(item.title)}</div>
        </div>
        <div class="detail-field">
            <div class="detail-label">链接</div>
            <div class="detail-value"><a href="${escapeHtml(item.link)}" target="_blank">${escapeHtml(item.link)}</a></div>
        </div>
        <div class="detail-field">
            <div class="detail-label">作者</div>
            <div class="detail-value">${escapeHtml(item.author || '-')}</div>
        </div>
        <div class="detail-field">
            <div class="detail-label">播放量</div>
            <div class="detail-value">${formatNumber(item.views)}</div>
        </div>
        <div class="detail-field">
            <div class="detail-label">审核状态</div>
            <div class="detail-value"><span class="status-badge ${getStatusClass(item.status)}">${item.status}</span></div>
        </div>
        <div class="detail-field">
            <div class="detail-label">提交时间</div>
            <div class="detail-value">${formatDate(item.created_at)}</div>
        </div>
    `;

    // 审核页面弹窗显示操作按钮
    const currentPage = document.querySelector('.page.active').id;
    if (currentPage === 'reviewPage') {
        footer.innerHTML = `
            <button class="btn btn-success btn-sm" onclick="updateReviewStatus(${item.id}, '已通过'); closeModal();">✓ 通过</button>
            <button class="btn btn-danger btn-sm" onclick="updateReviewStatus(${item.id}, '不通过'); closeModal();">✗ 不通过</button>
            <button class="btn btn-outline btn-sm" onclick="updateReviewStatus(${item.id}, '待审核'); closeModal();">↩ 重置</button>
        `;
    } else {
        footer.innerHTML = `<button class="btn btn-outline btn-block" onclick="closeModal()">关闭</button>`;
    }

    document.getElementById('detailModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('detailModal').style.display = 'none';
    document.body.style.overflow = '';
}

// ========== 渲染卡片 ==========
function renderSubmissionCard(item, mode) {
    const statusClass = getStatusClass(item.status);

    let actionsHtml = '';
    if (mode === 'review') {
        actionsHtml = `
            <div class="item-actions">
                <button class="btn btn-success btn-sm" onclick="updateReviewStatus(${item.id}, '已通过')">✓ 通过</button>
                <button class="btn btn-danger btn-sm" onclick="updateReviewStatus(${item.id}, '不通过')">✗ 不通过</button>
                <button class="btn btn-outline btn-sm" onclick="showDetail(${item.id})">详情</button>
            </div>
        `;
    } else {
        actionsHtml = `
            <div class="item-actions">
                <span class="status-badge ${statusClass}">${item.status}</span>
                <button class="btn btn-outline btn-sm" onclick="showDetail(${item.id})" style="margin-left:auto;">详情</button>
            </div>
        `;
    }

    return `
        <div class="item-card status-${statusClass}" onclick="showDetail(${item.id})">
            <div class="item-title">${escapeHtml(item.title)}</div>
            <div class="item-meta">
                <span>📌 ${escapeHtml(item.unit)}</span>
                <span>📱 ${escapeHtml(item.platform)}</span>
                ${item.author ? `<span>✍️ ${escapeHtml(item.author)}</span>` : ''}
                ${item.views ? `<span>▶️ ${formatNumber(item.views)}</span>` : ''}
                <span>🕐 ${formatDate(item.created_at)}</span>
            </div>
            ${actionsHtml}
        </div>
    `;
}

// ========== 工具函数 ==========
function getStatusClass(status) {
    switch (status) {
        case '待审核': return 'pending';
        case '已通过': return 'passed';
        case '不通过': return 'rejected';
        default: return 'pending';
    }
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const hour = d.getHours().toString().padStart(2, '0');
    const minute = d.getMinutes().toString().padStart(2, '0');
    return `${month}-${day} ${hour}:${minute}`;
}

function formatNumber(num) {
    if (!num || num === 0) return '0';
    if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万';
    }
    return num.toLocaleString();
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

async function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
    } else {
        // Fallback for older browsers / WeChat webview
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        textarea.setSelectionRange(0, text.length);
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }
}

function showToast(message, type = '') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show' + (type ? ' ' + type : '');
    setTimeout(() => {
        toast.className = 'toast';
    }, 2500);
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'flex' : 'none';
}

// ========== 启动 ==========
document.addEventListener('DOMContentLoaded', initApp);
