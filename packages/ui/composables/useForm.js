import { reactive, toRefs, onMounted } from 'vue';

// Constantes de colores para errores
const ERROR_COLORS = {
    border: {
        light: 'border-red-400',
        dark: 'dark:border-red-500/50'
    },
    text: {
        light: 'text-slate-900', // Keep text readable
        dark: 'dark:text-white'
    },
    placeholder: {
        light: 'placeholder-red-300',
        dark: 'dark:placeholder-red-500/50'
    },
    ring: {
        light: 'focus:ring-red-500/20', // Subtle glow instead of thick ring
        dark: 'dark:focus:ring-red-500/20'
    },
    focusBorder: {
        light: 'focus:border-red-500',
        dark: 'dark:focus:border-red-500'
    },
    message: {
        light: 'text-red-500',
        dark: 'dark:text-red-400'
    }
};

const rules = {
    required: (value) => {
        // inválido si: null/undefined, string vacío o solo espacios, array vacío
        if (value === null || value === undefined) return 'Este campo es obligatorio';
        if (typeof value === 'string' && value.trim() === '') return 'Este campo es obligatorio';
        if (Array.isArray(value) && value.length === 0) return 'Este campo es obligatorio';
        return true;
    },
    email: (value) => /.+@.+\..+/.test(value) || 'El correo no es válido',
    min: (value, arg) => value.length >= arg || `Debe tener al menos ${arg} caracteres`,
    int: (value) => Number.isInteger(+value) || 'Debe ser un número entero',
    rut: (value) => validateRut(value) || 'El RUT no es válido',
    same: (value, arg, form) => value === form[arg] || 'Los campos no coinciden',
};

const dictionary = {
    unique: 'Ya está registrado',
    required: 'Este campo es obligatorio',
    invalid: 'Dato inválido',
};

export function useForm(containerId, formDefinition, options = {}) {
    const zodSchema = options.zodSchema;
    const form = reactive({});
    const errors = reactive({});

    for (const field in formDefinition) {
        form[field] = formDefinition[field]?.value ?? '';
        errors[field] = [];
    }

    const reset = () => {
        for (const field in formDefinition) {
            form[field] = '';
            errors[field] = [];
            clearValidation(field);
        }
    };

    const resetErrors = () => {
        for (const field in formDefinition) {
            errors[field] = [];
            clearValidation(field);
        }
    };

    const validateField = (field) => {
        const def = formDefinition[field];
        const value = form[field];
        errors[field] = [];

        if (!def.rules) return true;

        def.rules.forEach(rule => {
            let ruleName = typeof rule === 'string' ? rule : rule.name;
            let arg = typeof rule === 'object' ? rule.arg : undefined;
            const result = rules[ruleName](value, arg, form);
            if (result !== true) {
                const custom = def.messages?.[ruleName];
                errors[field].push(custom || result);
            }
        });

        updateValidation(field);
        return errors[field].length === 0;
    };

    const validateForm = () => {
        if (zodSchema) {
            const result = zodSchema.safeParse(form);
            resetErrors();

            if (!result.success) {
                for (const issue of result.error.errors) {
                    const field = issue.path[0];
                    if (errors[field]) {
                        errors[field].push(issue.message);
                        updateValidation(field);
                    }
                }
                return false;
            }

            return true;
        }

        for (const field in formDefinition) validateField(field);

        return Object.values(errors).every(e => e.length === 0);
    };

    const updateValidation = (field) => {
        const el = document.querySelector(`#${containerId} [name="${field}"]`);
        if (!el) return;

        if (errors[field].length > 0) {
            // Limpiar validación anterior solo para reemplazarla
            clearValidation(field);

            // Aplicar clases de error al elemento usando las constantes
            el.classList.add(
                ERROR_COLORS.border.light,
                ERROR_COLORS.border.dark,
                ERROR_COLORS.text.light,
                ERROR_COLORS.text.dark,
                ERROR_COLORS.placeholder.light,
                ERROR_COLORS.placeholder.dark,
                ERROR_COLORS.ring.light,
                ERROR_COLORS.ring.dark,
                ERROR_COLORS.focusBorder.light,
                ERROR_COLORS.focusBorder.dark
            );

            const errorEl = document.createElement('p');
            errorEl.className = `mt-1 text-sm ${ERROR_COLORS.message.light} ${ERROR_COLORS.message.dark} form-error-message form-error-${field}`;
            errorEl.textContent = errors[field][0];

            // Buscar el contenedor correcto para insertar el mensaje de error
            let container = el.parentNode;

            // Si el input está dentro de un div relativo (como en el caso del password), 
            // el mensaje debe ir después de ese div
            if (container && container.classList.contains('relative')) {
                container.parentNode?.appendChild(errorEl);
            } else {
                // Para inputs normales y selects, agregar después del contenedor
                container?.appendChild(errorEl);
            }
        } else {
            // Solo limpiar si no hay errores
            clearValidation(field);
        }
    };

    const clearValidation = (field) => {
        const el = document.querySelector(`#${containerId} [name="${field}"]`);
        if (!el) return;

        // Remover clases de error usando las constantes
        el.classList.remove(
            ERROR_COLORS.border.light,
            ERROR_COLORS.border.dark,
            ERROR_COLORS.text.light,
            ERROR_COLORS.text.dark,
            ERROR_COLORS.placeholder.light,
            ERROR_COLORS.placeholder.dark,
            ERROR_COLORS.ring.light,
            ERROR_COLORS.ring.dark,
            ERROR_COLORS.focusBorder.light,
            ERROR_COLORS.focusBorder.dark
        );

        // Buscar y eliminar solo los mensajes de error específicos de este campo
        const formContainer = document.querySelector(`#${containerId}`);
        if (formContainer) {
            const fieldErrorMessages = formContainer.querySelectorAll(`.form-error-${field}`);
            fieldErrorMessages.forEach(errorEl => errorEl.remove());
        }
    };

    const addError = (field, message) => {
        if (message.startsWith('validation.')) {
            const key = message.split('.')[1];
            message = dictionary[key] || key;
        }

        errors[field].push(message);
        updateValidation(field);
    };

    const attachEvents = () => {
        // Solo adjuntar eventos si se especifican explícitamente
        // Si options.events es undefined o no se proporciona, no adjuntar eventos automáticos
        if (!options?.events || options.events.length === 0) {
            return;
        }

        const events = options.events;

        for (const field in formDefinition) {
            const el = document.querySelector(`#${containerId} [name="${field}"]`);
            if (el) {
                events.forEach(evt => el.addEventListener(evt, () => validateField(field)));
            }
        }
    };

    onMounted(() => {
        if (containerId) attachEvents();
    });

    const loadFromObject = (obj) => {
        for (const field in formDefinition) {
            if (obj[field] !== undefined) {
                console.log(`Loading field ${field} with value:`, obj[field]);
                form[field] = obj[field];
                clearValidation(field);
            }
        }
    }

    return {
        ...toRefs(form),
        values: form,
        errors,
        validate: (field) => field ? validateField(field) : validateForm(),
        reset,
        resetErrors,
        addError,
        loadFromObject,
        config: formDefinition
    };
}

function validateRut(rut) {
    if (!rut || typeof rut !== 'string') return false;
    rut = rut.replace(/^0+|[^0-9kK]+/g, '').toUpperCase();
    if (rut.length < 8) return false;
    const body = rut.slice(0, -1);
    const dv = rut.slice(-1);
    let sum = 0, multiplier = 2;
    for (let i = body.length - 1; i >= 0; i--) {
        sum += parseInt(body[i]) * multiplier;
        multiplier = multiplier < 7 ? multiplier + 1 : 2;
    }
    const expected = 11 - (sum % 11);
    const expectedDV = expected === 11 ? '0' : expected === 10 ? 'K' : expected.toString();
    return dv === expectedDV;
}
