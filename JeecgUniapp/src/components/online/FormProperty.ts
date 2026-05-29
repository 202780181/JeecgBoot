// 定义 FormProperty 函数
const FormProperty = (propertyId, formSchema, required = []) => {
    // 初始化私有属性
    const _propertyId = propertyId;
    const _formSchem = formSchema;
    const _required = required;

    // 定义 formSchema 的 getter 方法
    const getFormSchema = () => {
        return _formSchem || {};
    };

    // 定义 key 的 getter 方法
    const getKey = () => {
        return _propertyId;
    };

    // 定义 type 的 getter 方法
    const getType = () => {
        return getFormSchema().view;
    };

    // 定义 disabled 的 getter 方法
    const getDisabled = () => {
        if (_formSchem && _formSchem.ui && _formSchem.ui.widgetattrs && _formSchem.ui.widgetattrs.disabled === true) {
            return true;
        }
        return false;
    };

    // 定义 label 的 getter 方法
    const getLabel = () => {
        const schema = getFormSchema();
        return schema.title || getKey();
    };

    // 定义 placeholder 的 getter 方法
    const getPlaceholder = () => {
        const viewType = getType();
        const label = getLabel();
        if (viewType.indexOf('date') >= 0 || viewType.indexOf('select') >= 0 || viewType.indexOf('list') >= 0) {
            return "请选择" + label;
        } else if (viewType.indexOf('upload') >= 0 || viewType.indexOf('file') >= 0 || viewType.indexOf('image') >= 0) {
            return "请上传" + label;
        } else {
            return "请输入" + label;
        }
    };

    // 定义 dictStr 的 getter 方法
    const getDictStr = () => {
        const viewType = getType();
        if (viewType === 'sel_search') {
            const schema = getFormSchema();
            return schema.dictTable + ',' + schema.dictText + ',' + schema.dictCode;
        }
        return '';
    };

    // 定义 listSource 的 getter 方法
    const getListSource = () => {
        const schema = getFormSchema();
        if (!schema.enum) {
            return [];
        }
        const arr = [...schema.enum];
        for (let a = 0; a < arr.length; a++) {
            if (!arr[a].label) {
                arr[a].label = arr[a].text;
            }
            if (schema.type === 'number') {
                arr[a].value = parseInt(arr[a].value);
            }
        }
        return arr;
    };

    // 定义 popupCode 的 getter 方法
    const getPopupCode = () => {
        return getFormSchema().code;
    };

    // 定义 dest 的 getter 方法
    const getDest = () => {
        return getFormSchema().destFields;
    };

    // 定义 ogn 的 getter 方法
    const getOgn = () => {
        return getFormSchema().orgFields;
    };

    // 定义 rules 的 getter 方法
    const getRules = () => {
        const rules = [];
        const isRequired = _required?.includes(getKey()) ?? false;
        if (isRequired) {
            let msg = getLabel() + '为必填项';
            rules.push({ required: true, message: msg });
        }
        let viewType = getType();
        if ('list' === viewType || 'markdown' === viewType || 'pca' === viewType) {
            return rules;
        }
        if (viewType.indexOf('upload') >= 0 || viewType.indexOf('file') >= 0 || viewType.indexOf('image') >= 0) {
            return rules;
        }

        const schema = getFormSchema();
        if (schema.pattern) {
            if (schema.pattern === 'only') {
                // 这里 checkOnlyMethod 未定义，需要根据实际情况补充
                rules.push({ validator: () => {} });
            } else if (schema.pattern === 'z') {
                if (schema.type === 'number' || schema.type === 'integer') {
                    // 这里 onlyInteger 未定义，需要根据实际情况处理
                } else {
                    rules.push({ pattern: '^-?[1-9]\\d*$', message: '请输入整数' });
                }
            } else {
                let msg = getLabel() + '校验未通过';
                rules.push({ pattern: schema.pattern, message: msg });
            }
        }
        return rules;
    };

    // 返回包含所有 getter 方法的对象
    return {
        get formSchema() {
            return getFormSchema();
        },
        get key() {
            return getKey();
        },
        get type() {
            return getType();
        },
        get disabled() {
            return getDisabled();
        },
        get label() {
            return getLabel();
        },
        get placeholder() {
            return getPlaceholder();
        },
        get dictStr() {
            return getDictStr();
        },
        get listSource() {
            return getListSource();
        },
        get popupCode() {
            return getPopupCode();
        },
        get dest() {
            return getDest();
        },
        get ogn() {
            return getOgn();
        },
        get rules() {
            return getRules();
        }
    };
};

export default FormProperty;
