import { chat, deleteMessage } from '../../../../script.js';
import { POPUP_RESULT, POPUP_TYPE, callGenericPopup } from '../../../popup.js';

const MENU_BUTTON_ID = 'bulk_message_delete_wand';
const ACTION_BAR_ID = 'bulk_message_delete_bar';
const SELECT_USER_BUTTON_ID = 'bulk_message_delete_select_user';
const DELETE_BUTTON_ID = 'bulk_message_delete_open_review';
const CANCEL_BUTTON_ID = 'bulk_message_delete_cancel';
const MODE_CLASS = 'bulk-message-delete-mode';
const CHECKBOX_CLASS = 'bulk-message-delete-checkbox';
const REVIEW_CHECKBOX_CLASS = 'bulk-message-delete-review-checkbox';
const SELECTED_CLASS = 'bulk-message-delete-selected';

let isSelectionMode = false;
let chatObserver = null;
const selectedMessageIds = new Set();

function getMessageId(messageElement) {
    const messageId = Number(messageElement.getAttribute('mesid'));
    return Number.isInteger(messageId) && messageId >= 0 ? messageId : null;
}

function getMessageElements() {
    return Array.from(document.querySelectorAll('#chat .mes[mesid]'));
}

function getMessageElementById(messageId) {
    return document.querySelector(`#chat .mes[mesid="${messageId}"]`);
}

function getRoleLabel(messageElement) {
    const name = messageElement.getAttribute('ch_name')?.trim() || '未知';
    if (messageElement.getAttribute('is_user') === 'true') {
        return `用户：${name}`;
    }

    if (messageElement.getAttribute('is_system') === 'true') {
        return `系统：${name}`;
    }

    return `角色：${name}`;
}

function getPreviewText(messageElement) {
    const text = messageElement.querySelector('.mes_text')?.textContent ?? '';
    const compactText = text.replace(/\s+/g, ' ').trim();
    return compactText ? compactText.slice(0, 20) : '空消息';
}

function getSelectedMessageSummaries() {
    return Array.from(selectedMessageIds)
        .sort((a, b) => a - b)
        .map(messageId => {
            const messageElement = getMessageElementById(messageId);
            if (!messageElement) {
                return null;
            }

            return {
                messageId,
                role: getRoleLabel(messageElement),
                preview: getPreviewText(messageElement),
            };
        })
        .filter(Boolean);
}

function updateMenuButton() {
    const button = document.getElementById(MENU_BUTTON_ID);
    if (!button) {
        return;
    }

    const label = button.querySelector('.bulk-message-delete-label');
    if (!label) {
        return;
    }

    let title = '批量勾选删除消息';
    let labelText = '批量勾选删除';

    if (isSelectionMode) {
        title = '退出批量删除选择模式';
        labelText = '退出批量删除';
    }

    button.classList.toggle('bulk-message-delete-active', isSelectionMode);
    button.title = title;
    label.textContent = labelText;
}

function updateActionBar() {
    const deleteButton = document.getElementById(DELETE_BUTTON_ID);
    if (!deleteButton) {
        return;
    }

    deleteButton.textContent = `删除 (${selectedMessageIds.size})`;
    deleteButton.classList.toggle('disabled', selectedMessageIds.size === 0);
    deleteButton.setAttribute('aria-disabled', String(selectedMessageIds.size === 0));
}

function updateUi() {
    updateMenuButton();
    updateActionBar();
}

function setMessageSelected(messageElement, selected) {
    const messageId = getMessageId(messageElement);
    if (messageId === null) {
        return;
    }

    if (selected) {
        selectedMessageIds.add(messageId);
    } else {
        selectedMessageIds.delete(messageId);
    }

    messageElement.classList.toggle(SELECTED_CLASS, selected);

    const checkbox = messageElement.querySelector(`.${CHECKBOX_CLASS}`);
    if (checkbox) {
        checkbox.checked = selected;
    }

    updateUi();
}

function selectUserMessages() {
    syncSelectionControls();

    let selectedCount = 0;
    for (const messageElement of getMessageElements()) {
        if (messageElement.getAttribute('is_user') !== 'true') {
            continue;
        }

        setMessageSelected(messageElement, true);
        selectedCount++;
    }

    if (selectedCount === 0) {
        toastr.warning('当前已加载楼层中没有用户输入');
        return;
    }

    toastr.info(`已勾选 ${selectedCount} 条用户输入`);
}

function onCheckboxChange(event) {
    const checkbox = event.currentTarget;
    const messageElement = checkbox.closest('#chat .mes[mesid]');
    if (!messageElement) {
        return;
    }

    setMessageSelected(messageElement, checkbox.checked);
}

function addSelectionControl(messageElement) {
    const messageId = getMessageId(messageElement);
    if (messageId === null || messageElement.querySelector(`.${CHECKBOX_CLASS}`)) {
        return;
    }

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = CHECKBOX_CLASS;
    checkbox.title = `选择第 ${messageId} 楼`;
    checkbox.setAttribute('aria-label', `选择第 ${messageId} 楼`);
    checkbox.checked = selectedMessageIds.has(messageId);
    checkbox.addEventListener('change', onCheckboxChange);
    checkbox.addEventListener('click', event => event.stopPropagation());
    checkbox.addEventListener('mousedown', event => event.stopPropagation());

    messageElement.prepend(checkbox);
    messageElement.classList.toggle(SELECTED_CLASS, checkbox.checked);
}

function syncSelectionControls() {
    const existingMessageIds = new Set();
    for (const messageElement of getMessageElements()) {
        const messageId = getMessageId(messageElement);
        if (messageId === null) {
            continue;
        }

        existingMessageIds.add(messageId);
        addSelectionControl(messageElement);
        messageElement.classList.toggle(SELECTED_CLASS, selectedMessageIds.has(messageId));
    }

    for (const selectedId of Array.from(selectedMessageIds)) {
        if (!existingMessageIds.has(selectedId)) {
            selectedMessageIds.delete(selectedId);
        }
    }

    updateUi();
}

function removeSelectionControls() {
    for (const messageElement of getMessageElements()) {
        messageElement.classList.remove(SELECTED_CLASS);
        messageElement.querySelector(`.${CHECKBOX_CLASS}`)?.remove();
    }
}

function clearSelectionControls() {
    removeSelectionControls();
    selectedMessageIds.clear();
    updateUi();
}

function startChatObserver() {
    if (chatObserver) {
        return;
    }

    const chatElement = document.getElementById('chat');
    if (!chatElement) {
        return;
    }

    chatObserver = new MutationObserver(syncSelectionControls);
    chatObserver.observe(chatElement, { childList: true });
}

function stopChatObserver() {
    chatObserver?.disconnect();
    chatObserver = null;
}

function setSelectionMode(enabled) {
    isSelectionMode = enabled;
    document.body.classList.toggle(MODE_CLASS, isSelectionMode);

    if (isSelectionMode) {
        syncSelectionControls();
        startChatObserver();
    } else {
        stopChatObserver();
        clearSelectionControls();
    }

    toastr.info(isSelectionMode ? '已进入批量删除选择模式' : '已退出批量删除选择模式');
}

function createReviewPopupContent(messageSummaries) {
    const wrapper = document.createElement('div');
    wrapper.className = 'bulk-message-delete-review';

    const backupNotice = document.createElement('div');
    backupNotice.className = 'bulk-message-delete-backup-notice';
    backupNotice.textContent = '删除前请确认已经备份当前聊天。确认删除会修改当前聊天文件。';
    wrapper.appendChild(backupNotice);

    const summary = document.createElement('div');
    summary.className = 'bulk-message-delete-review-summary';
    summary.textContent = `已勾选 ${messageSummaries.length} 条消息。取消勾选的楼层不会删除。确认后将按原始楼层从大到小作删除处理。`;
    wrapper.appendChild(summary);

    const list = document.createElement('div');
    list.className = 'bulk-message-delete-review-list';
    wrapper.appendChild(list);

    for (const message of messageSummaries) {
        const row = document.createElement('label');
        row.className = 'bulk-message-delete-review-row';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = REVIEW_CHECKBOX_CLASS;
        checkbox.checked = true;
        checkbox.value = String(message.messageId);
        row.appendChild(checkbox);

        const messageId = document.createElement('span');
        messageId.className = 'bulk-message-delete-review-id';
        messageId.textContent = `#${message.messageId}`;
        row.appendChild(messageId);

        const role = document.createElement('span');
        role.className = 'bulk-message-delete-review-role';
        role.textContent = message.role;
        row.appendChild(role);

        const preview = document.createElement('span');
        preview.className = 'bulk-message-delete-review-preview';
        preview.textContent = message.preview;
        row.appendChild(preview);

        list.appendChild(row);
    }

    return wrapper;
}

function getReviewCheckedIds(content) {
    return new Set(Array.from(content.querySelectorAll(`.${REVIEW_CHECKBOX_CLASS}:checked`))
        .map(checkbox => Number(checkbox.value))
        .filter(messageId => Number.isInteger(messageId) && messageId >= 0));
}

function leaveSelectionModeAfterDelete() {
    isSelectionMode = false;
    document.body.classList.remove(MODE_CLASS);
    stopChatObserver();
    removeSelectionControls();
    updateUi();
}

async function deleteSelectedMessages(messageIds) {
    const originalIds = Array.from(messageIds).sort((a, b) => b - a);
    const successfulIds = [];
    const failedMessages = [];

    leaveSelectionModeAfterDelete();

    for (const originalId of originalIds) {
        const currentId = originalId;
        const currentElement = getMessageElementById(currentId);

        if (!currentElement || currentId >= chat.length) {
            failedMessages.push({ messageId: originalId, reason: '当前楼层不存在' });
            continue;
        }

        const lengthBeforeDelete = chat.length;

        try {
            await deleteMessage(currentId);
        } catch (error) {
            failedMessages.push({ messageId: originalId, reason: error?.message ?? String(error) });
            continue;
        }

        if (chat.length === lengthBeforeDelete - 1) {
            successfulIds.push(originalId);
        } else {
            failedMessages.push({ messageId: originalId, reason: '酒馆未确认删除成功' });
        }
    }

    selectedMessageIds.clear();
    updateUi();

    if (failedMessages.length === 0) {
        toastr.success(`删除成功：已删除 ${successfulIds.length} 条消息（${successfulIds.map(id => `#${id}`).join('、')}）`);
        return;
    }

    const failedIds = failedMessages.map(message => `#${message.messageId}`).join('、');
    toastr.error(`部分消息未删除成功：${failedIds}`);
    console.error('[bulk-message-delete] Failed to delete selected messages.', failedMessages);

    if (successfulIds.length > 0) {
        toastr.info(`已成功删除：${successfulIds.map(id => `#${id}`).join('、')}`);
    }
}

async function openReviewPopup() {
    syncSelectionControls();

    const messageSummaries = getSelectedMessageSummaries();
    if (messageSummaries.length === 0) {
        toastr.warning('请先勾选要处理的楼层');
        return;
    }

    const content = createReviewPopupContent(messageSummaries);
    const result = await callGenericPopup(content, POPUP_TYPE.CONFIRM, '', {
        okButton: '确认删除',
        cancelButton: '返回',
        wide: true,
        allowVerticalScrolling: true,
    });

    const checkedIds = getReviewCheckedIds(content);

    if (result !== POPUP_RESULT.AFFIRMATIVE) {
        return;
    }

    if (checkedIds.size === 0) {
        toastr.warning('没有勾选任何楼层，未执行删除');
        return;
    }

    await deleteSelectedMessages(checkedIds);
}

function toggleSelectionMode() {
    setSelectionMode(!isSelectionMode);
}

function openReviewPopupFromButton() {
    openReviewPopup().catch(error => {
        console.error('[bulk-message-delete] Failed to open review popup.', error);
        toastr.error('打开批量删除确认弹窗失败');
    });
}

function addActionBar() {
    if (document.getElementById(ACTION_BAR_ID)) {
        return;
    }

    const formShelter = document.getElementById('form_sheld');
    const sendForm = document.getElementById('send_form');
    if (!formShelter || !sendForm) {
        console.warn('[bulk-message-delete] Form container was not found.');
        return;
    }

    const bar = document.createElement('div');
    bar.id = ACTION_BAR_ID;
    bar.innerHTML = `
        <div id="${SELECT_USER_BUTTON_ID}" class="menu_button">一键勾选 user 输入</div>
        <div id="${DELETE_BUTTON_ID}" class="menu_button">删除 (0)</div>
        <div id="${CANCEL_BUTTON_ID}" class="menu_button">取消</div>
    `;

    formShelter.insertBefore(bar, sendForm);
    document.getElementById(SELECT_USER_BUTTON_ID)?.addEventListener('click', selectUserMessages);
    document.getElementById(DELETE_BUTTON_ID)?.addEventListener('click', openReviewPopupFromButton);
    document.getElementById(CANCEL_BUTTON_ID)?.addEventListener('click', () => setSelectionMode(false));
}

function addWandMenuButton() {
    if (document.getElementById(MENU_BUTTON_ID)) {
        return;
    }

    const menu = document.getElementById('extensionsMenu');
    if (!menu) {
        console.warn('[bulk-message-delete] Extensions menu was not found.');
        return;
    }

    const button = document.createElement('div');
    button.id = MENU_BUTTON_ID;
    button.classList.add('list-group-item', 'flex-container', 'flexGap5');
    button.title = '批量勾选删除消息';
    button.innerHTML = `
        <div class="fa-solid fa-list-check extensionsMenuExtensionButton"></div>
        <span class="bulk-message-delete-label">批量勾选删除</span>
    `;
    button.addEventListener('click', toggleSelectionMode);

    menu.appendChild(button);
}

jQuery(() => {
    addActionBar();
    addWandMenuButton();
});
