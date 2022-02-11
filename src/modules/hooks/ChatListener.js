/**
 *
 * @version 1.0.0
 */
export class ChatListener {

    static init(dom = null) {
        this.refresh(dom);
    }

    /**
     * Refreshes the chat listeners
     */
    static refresh(dom = null) {
        dom = dom || document.getElementById("chat");
        const chatMsgLink = dom.querySelectorAll('.lsnpc-document-link');

        chatMsgLink.forEach(async el => {
            el.addEventListener('click', async (e) => {
                e.preventDefault();
                if (!e.currentTarget.dataset.uuid) return;

                const doc = await fromUuid(e.currentTarget.dataset.uuid);
                if (!doc) return;

                if (doc.collectionName == 'tokens') {
                    await doc.actor.sheet.render(true);
                } else {
                    await doc.sheet.render(true);
                }
                e.stopPropagation();
            });
        });
    }
}

/**
 *
 * @param {HTMLCollection} dom
 */
export function refreshChatListeners(dom = null) {
    ChatListener.refresh(dom);
}