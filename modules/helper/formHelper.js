class formHelper {
    /**
     * 
     * @param {HTMLElement} element 
     * @returns 
     */
    static getParentForm(element) {
        return element.target.closest(form);
    }
}

export default formHelper;