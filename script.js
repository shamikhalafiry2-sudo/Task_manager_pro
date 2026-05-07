(function() {
    'use strict';

    // ============ عناصر DOM الأساسية ============
    const taskForm = document.getElementById('taskForm');
    const taskTitleInput = document.getElementById('taskTitle');
    const taskDueDateInput = document.getElementById('taskDueDate');
    const taskPrioritySelect = document.getElementById('taskPriority');
    const editIdInput = document.getElementById('editId');
    const submitBtn = document.getElementById('submitBtn');
    const taskListEl = document.getElementById('taskList');
    const searchInput = document.getElementById('searchInput');
    const filterChips = document.querySelectorAll('.chip');
    const statTotal = document.getElementById('statTotal');
    const statDone = document.getElementById('statDone');
    const statUrgent = document.getElementById('statUrgent');
    const toastContainer = document.getElementById('toastContainer');
    const motivationMsg = document.getElementById('motivationMsg');
    const reminderBanner = document.getElementById('reminderBanner');
    const reminderText = document.getElementById('reminderText');
    const userLevelEl = document.getElementById('userLevel');
    const userXPEl = document.getElementById('userXP');
    const xpNeededEl = document.getElementById('xpNeeded');
    const xpFill = document.getElementById('xpFill');
    const darkModeBtn = document.getElementById('darkModeBtn');

    // ============ حالة التطبيق ============
    let tasks = [];
    let currentFilter = 'all';
    let searchQuery = '';
    let userXP = 0;
    let userLevel = 1;
    const STORAGE_KEY = 'taskflow_pro_tasks';
    const XP_KEY = 'taskflow_pro_xp';
    const DARK_KEY = 'taskflow_pro_dark';

    // ============ دوال XP والمستوى ============
    function xpForLevel(level) {
        return level * 10;
    }

    function loadXP() {
        try {
            const stored = localStorage.getItem(XP_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                userXP = data.xp || 0;
                userLevel = data.level || 1;
            }
        } catch (e) {
            userXP = 0;
            userLevel = 1;
        }
    }

    function saveXP() {
        try {
            localStorage.setItem(XP_KEY, JSON.stringify({ xp: userXP, level: userLevel }));
        } catch (e) { /* silent */ }
    }

    function addXP(amount) {
        userXP += amount;
        const needed = xpForLevel(userLevel);
        if (userXP >= needed) {
            userXP -= needed;
            userLevel++;
            showToast(`🎉 تهانينا! ارتقيت إلى المستوى ${userLevel}!`, 'success');
        }
        updateXPUI();
        saveXP();
    }

    function updateXPUI() {
        const needed = xpForLevel(userLevel);
        userLevelEl.textContent = userLevel;
        userXPEl.textContent = userXP;
        xpNeededEl.textContent = needed;
        const percent = Math.min((userXP / needed) * 100, 100);
        xpFill.style.width = percent + '%';
    }

    // ============ دوال الوضع الليلي ============
    function applyDarkMode(enabled) {
        if (enabled) {
            document.body.classList.add('dark');
            darkModeBtn.innerHTML = '☀️ <span>نهاري</span>';
        } else {
            document.body.classList.remove('dark');
            darkModeBtn.innerHTML = '🌙 <span>ليلي</span>';
        }
    }

    function loadDarkMode() {
        try {
            const stored = localStorage.getItem(DARK_KEY);
            if (stored !== null) {
                applyDarkMode(stored === 'true');
            }
        } catch (e) { /* silent */ }
    }

    function toggleDark() {
        const isDark = document.body.classList.contains('dark');
        const newMode = !isDark;
        applyDarkMode(newMode);
        try { localStorage.setItem(DARK_KEY, newMode); } catch (e) { /* silent */ }
        showToast(newMode ? '🌙 تم تفعيل الوضع الليلي' : '☀️ تم تفعيل الوضع النهاري', 'info');
    }

    // ============ دوال المشاركة والتقييم ============
    function shareApp() {
        const shareData = {
            title: 'TaskFlow Pro',
            text: 'جرب هذا التطبيق الرائع لتنظيم مهامك اليومية 🔥',
            url: window.location.href
        };
        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            navigator.share(shareData).catch(() => {});
        } else {
            // fallback: نسخ الرابط
            navigator.clipboard?.writeText(window.location.href)
                .then(() => showToast('📋 تم نسخ الرابط! شاركه مع أصدقائك 👍', 'success'))
                .catch(() => alert('انسخ الرابط وشاركه مع أصحابك 👍\n' + window.location.href));
        }
    }

    // ============ مودال Premium ============
    function showPremium() {
        document.getElementById('premiumModal').style.display = 'flex';
    }

    function closePremium() {
        document.getElementById('premiumModal').style.display = 'none';
        showToast('🚀 شكرًا لاهتمامك! الميزات القادمة ستكون رهيبة', 'info');
    }

    // ============ دوال التحفيز ============
    function getMotivation() {
        const msgs = [
            '🔥 استمر، أنت قريب من هدفك!',
            '💪 إنجاز بسيط اليوم = نجاح كبير بكرة',
            '🚀 ركّز وخلّص مهمة وحدة الآن',
            '🌟 كل مهمة مكتملة تقربك من حلمك',
            '🎯 التركيز على مهمة واحدة = إنجاز مضمون',
            '💎 أنت تبني مستقبلك مهمة بمهمة',
            '👑 الأبطال يصنعون عاداتهم اليومية',
            '⚡ لا تؤجل عمل اليوم إلى الغد'
        ];
        return msgs[Math.floor(Math.random() * msgs.length)];
    }

    function updateMotivation() {
        motivationMsg.textContent = getMotivation();
    }

    // ============ دوال التذكير ============
    function checkTodayTasks() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayTasks = tasks.filter(t => {
            if (t.completed || !t.dueDate) return false;
            const due = new Date(t.dueDate + 'T00:00:00');
            return due >= today && due < tomorrow;
        });

        if (todayTasks.length > 0) {
            reminderBanner.style.display = 'block';
            reminderText.textContent = `لديك ${todayTasks.length} مهمة مستحقة اليوم! لا تؤجلها`;
        } else {
            const overdue = tasks.filter(t => !t.completed && t.dueDate && isOverdue(t.dueDate));
            if (overdue.length > 0) {
                reminderBanner.style.display = 'block';
                reminderText.textContent = `⚠️ لديك ${overdue.length} مهمة متأخرة عن موعدها`;
            } else {
                reminderBanner.style.display = 'none';
            }
        }
    }

    // ============ دوال مساعدة (محمولة) ============
    function saveTasks() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        } catch (e) {
            showToast('⚠️ فشل حفظ البيانات - تجاوز سعة التخزين المحلية', 'error');
            console.error('LocalStorage save error:', e);
        }
    }

    function loadTasks() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) tasks = parsed;
            }
        } catch (e) {
            tasks = [];
            showToast('⚠️ تعذر استرجاع البيانات المخزنة', 'error');
        }
    }

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 3100);
    }

    function validateTask(title, dueDate) {
        const errors = [];
        const trimmed = title.trim();
        if (!trimmed) errors.push('عنوان المهمة مطلوب.');
        if (trimmed.length > 120) errors.push('العنوان طويل جداً.');
        if (dueDate) {
            const d = new Date(dueDate + 'T00:00:00');
            if (isNaN(d.getTime())) errors.push('صيغة التاريخ غير صالحة.');
        }
        return errors;
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr + 'T00:00:00');
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function isOverdue(dateStr) {
        if (!dateStr) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return new Date(dateStr + 'T00:00:00') < today;
    }

    // ============ فلترة وعرض ============
    function getFilteredTasks() {
        let filtered = [...tasks];
        if (currentFilter === 'active') filtered = filtered.filter(t => !t.completed);
        else if (currentFilter === 'completed') filtered = filtered.filter(t => t.completed);
        else if (currentFilter === 'high') filtered = filtered.filter(t => t.priority === 'high' && !t.completed);
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            filtered = filtered.filter(t => t.title.toLowerCase().includes(q));
        }
        const order = { high: 0, medium: 1, low: 2 };
        filtered.sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            if (a.priority !== b.priority) return order[a.priority] - order[b.priority];
            if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
            if (a.dueDate) return -1;
            if (b.dueDate) return 1;
            return 0;
        });
        return filtered;
    }

    function createTaskElement(task) {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;
        li.setAttribute('data-id', task.id);

        const indicator = document.createElement('div');
        indicator.className = `priority-indicator priority-${task.priority}`;

        const content = document.createElement('div');
        content.className = 'task-content';
        const titleEl = document.createElement('div');
        titleEl.className = 'task-title';
        titleEl.textContent = task.title;
        const meta = document.createElement('div');
        meta.className = 'task-meta';
        const badge = document.createElement('span');
        badge.className = `badge badge-${task.priority}`;
        badge.textContent = { high: '🔴 عالية', medium: '🟡 متوسطة', low: '🟢 منخفضة' }[task.priority];
        const dateSpan = document.createElement('span');
        if (task.dueDate) {
            const overdue = !task.completed && isOverdue(task.dueDate);
            dateSpan.textContent = '📅 ' + formatDate(task.dueDate);
            if (overdue) { dateSpan.classList.add('due-overdue'); dateSpan.textContent += ' ⚠️ متأخرة'; }
        } else {
            dateSpan.textContent = '📅 بدون تاريخ';
        }
        meta.appendChild(badge);
        meta.appendChild(dateSpan);
        content.appendChild(titleEl);
        content.appendChild(meta);

        const actions = document.createElement('div');
        actions.className = 'task-actions';

        const completeBtn = document.createElement('button');
        completeBtn.className = `icon-btn ${task.completed ? 'success' : ''}`;
        completeBtn.title = task.completed ? 'تراجع' : 'إكمال';
        completeBtn.innerHTML = task.completed ? '↩️' : '✅';
        completeBtn.onclick = (e) => { e.stopPropagation(); toggleComplete(task.id); };

        const editBtn = document.createElement('button');
        editBtn.className = 'icon-btn';
        editBtn.title = 'تعديل';
        editBtn.innerHTML = '✏️';
        editBtn.onclick = (e) => { e.stopPropagation(); startEdit(task); };

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'icon-btn danger';
        deleteBtn.title = 'حذف';
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.onclick = (e) => { e.stopPropagation(); deleteTask(task.id); };

        actions.appendChild(completeBtn);
        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        li.appendChild(indicator);
        li.appendChild(content);
        li.appendChild(actions);
        return li;
    }

    function renderTasks() {
        const filtered = getFilteredTasks();
        taskListEl.innerHTML = '';
        if (!filtered.length) {
            const div = document.createElement('div');
            div.className = 'empty-state';
            div.innerHTML = '<span class="empty-icon">📋</span><p>لا توجد مهام</p><p style="font-size:0.8rem">ابدأ بإضافة مهمة ✨</p>';
            taskListEl.appendChild(div);
        } else {
            filtered.forEach(t => taskListEl.appendChild(createTaskElement(t)));
        }
        updateStats();
        checkTodayTasks();
    }

    function updateStats() {
        statTotal.textContent = tasks.length;
        statDone.textContent = tasks.filter(t => t.completed).length;
        statUrgent.textContent = tasks.filter(t => t.priority === 'high' && !t.completed).length;
    }

    // ============ عمليات المهام ============
    function saveTask(e) {
        e.preventDefault();
        const title = taskTitleInput.value;
        const dueDate = taskDueDateInput.value;
        const priority = taskPrioritySelect.value;
        const editId = editIdInput.value;
        const errors = validateTask(title, dueDate);
        if (errors.length) {
            showToast('❌ ' + errors.join(' '), 'error');
            taskTitleInput.style.borderColor = 'var(--danger)';
            taskTitleInput.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.25)';
            setTimeout(() => { taskTitleInput.style.borderColor = ''; taskTitleInput.style.boxShadow = ''; }, 1500);
            return;
        }
        if (editId) {
            const idx = tasks.findIndex(t => t.id === editId);
            if (idx === -1) { resetForm(); renderTasks(); return; }
            tasks[idx].title = title.trim();
            tasks[idx].dueDate = dueDate;
            tasks[idx].priority = priority;
            showToast('✅ تم تحديث المهمة', 'success');
        } else {
            tasks.push({
                id: generateId(),
                title: title.trim(),
                dueDate,
                priority,
                completed: false,
                createdAt: new Date().toISOString()
            });
            showToast('🎉 تمت إضافة المهمة', 'success');
        }
        saveTasks();
        resetForm();
        renderTasks();
    }

    function resetForm() {
        taskForm.reset();
        editIdInput.value = '';
        submitBtn.textContent = '➕ إضافة مهمة';
        submitBtn.style.background = '';
        taskTitleInput.focus();
    }

    function startEdit(task) {
        editIdInput.value = task.id;
        taskTitleInput.value = task.title;
        taskDueDateInput.value = task.dueDate || '';
        taskPrioritySelect.value = task.priority;
        submitBtn.textContent = '✏️ تحديث المهمة';
        submitBtn.style.background = '#7c3aed';
        taskTitleInput.focus();
        taskForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function deleteTask(id) {
        const task = tasks.find(t => t.id === id);
        if (!task) { renderTasks(); return; }
        if (task.priority === 'high' && !task.completed) {
            if (!confirm('⚠️ مهمة عالية الأولوية. متأكد من الحذف؟')) return;
        }
        tasks = tasks.filter(t => t.id !== id);
        saveTasks();
        if (editIdInput.value === id) resetForm();
        renderTasks();
        showToast('🗑️ تم حذف المهمة', 'info');
    }

    function toggleComplete(id) {
        const task = tasks.find(t => t.id === id);
        if (!task) { renderTasks(); return; }
        const wasCompleted = task.completed;
        task.completed = !task.completed;
        saveTasks();
        renderTasks();
        if (!wasCompleted && task.completed) {
            // إضافة XP عند الإكمال
            const xpGain = task.priority === 'high' ? 5 : task.priority === 'medium' ? 3 : 1;
            addXP(xpGain);
            showToast(`🎯 مهمة مكتملة! +${xpGain} XP`, 'success');
            updateMotivation();
            // عرض رسالة تحفيزية عشوائية كل 3 إكمالات
            const completedCount = tasks.filter(t => t.completed).length;
            if (completedCount % 3 === 0) {
                setTimeout(() => showToast(getMotivation(), 'motivation'), 1500);
            }
        }
    }

    // ============ إشعارات المتصفح ============
    function requestNotificationPermission() {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'default') {
            Notification.requestPermission().catch(() => {});
        }
    }

    function checkUpcomingUrgent() {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;
        const today = new Date(); today.setHours(0,0,0,0);
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
        tasks.filter(t => {
            if (t.completed || t.priority !== 'high' || !t.dueDate) return false;
            const d = new Date(t.dueDate + 'T00:00:00');
            return d >= today && d <= tomorrow;
        }).forEach(t => {
            try {
                new Notification('⚠️ مهمة عالية الأولوية تقترب', {
                    body: `"${t.title}" - ${formatDate(t.dueDate)}`,
                    tag: t.id
                });
            } catch(e){}
        });
    }

    // ============ تهيئة التطبيق ============
    function init() {
        loadDarkMode();
        loadTasks();
        loadXP();
        updateXPUI();
        renderTasks();
        resetForm();
        updateMotivation();
        requestNotificationPermission();
        setTimeout(checkUpcomingUrgent, 2000);
        setInterval(checkUpcomingUrgent, 10 * 60 * 1000);
        // تغيير الرسالة التحفيزية كل 5 دقائق
        setInterval(updateMotivation, 5 * 60 * 1000);
        // رسالة تحفيزية عند الفتح
        setTimeout(() => showToast(getMotivation(), 'motivation'), 3000);
        console.log('✅ TaskFlow Pro جاهز | مهام:', tasks.length, '| مستوى:', userLevel, '| XP:', userXP);
    }

    // ============ مستمعي الأحداث ============
    taskForm.addEventListener('submit', saveTask);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && editIdInput.value) { resetForm(); showToast('↩️ تم إلغاء التعديل', 'info'); }
    });
    searchInput.addEventListener('input', () => { searchQuery = searchInput.value; renderTasks(); });
    filterChips.forEach(ch => {
        ch.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            ch.classList.add('active');
            currentFilter = ch.getAttribute('data-filter');
            renderTasks();
        });
    });
    document.body.addEventListener('click', requestNotificationPermission, { once: true });

    // تعريض الدوال العامة
    window.toggleDark = toggleDark;
    window.shareApp = shareApp;
    window.showPremium = showPremium;
    window.closePremium = closePremium;

    // تعريض للـ console
    window.__taskFlow = {
        getTasks: () => tasks,
        getXP: () => ({ xp: userXP, level: userLevel }),
        resetAll: () => {
            if (confirm('⚠️ حذف جميع المهام وإعادة تعيين XP؟')) {
                tasks = []; userXP = 0; userLevel = 1;
                saveTasks(); saveXP(); updateXPUI();
                resetForm(); renderTasks();
                showToast('🗑️ تم إعادة التعيين بالكامل', 'info');
            }
        }
    };

    init();
})();