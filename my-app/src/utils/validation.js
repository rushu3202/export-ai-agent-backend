import { useState } from 'react';

export const validators = {
  required: (value) => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return 'This field is required';
    }
    return null;
  },

  email: (value) => {
    if (!value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  },

  phone: (value) => {
    if (!value) return null;
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!phoneRegex.test(value) || value.replace(/\D/g, '').length < 10) {
      return 'Please enter a valid phone number';
    }
    return null;
  },

  minLength: (min) => (value) => {
    if (!value) return null;
    if (value.length < min) {
      return `Must be at least ${min} characters`;
    }
    return null;
  },

  maxLength: (max) => (value) => {
    if (!value) return null;
    if (value.length > max) {
      return `Must be no more than ${max} characters`;
    }
    return null;
  },

  number: (value) => {
    if (!value && value !== 0) return null;
    if (isNaN(value)) {
      return 'Please enter a valid number';
    }
    return null;
  },

  positive: (value) => {
    if (!value && value !== 0) return null;
    if (Number(value) <= 0) {
      return 'Must be a positive number';
    }
    return null;
  },

  url: (value) => {
    if (!value) return null;
    try {
      new URL(value);
      return null;
    } catch {
      return 'Please enter a valid URL';
    }
  },

  currency: (value) => {
    if (!value && value !== 0) return null;
    if (isNaN(value) || Number(value) < 0) {
      return 'Please enter a valid amount';
    }
    return null;
  }
};

export function validateField(value, rules) {
  if (!rules || rules.length === 0) return null;
  
  for (const rule of rules) {
    const error = rule(value);
    if (error) return error;
  }
  
  return null;
}

function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((acc, key) => {
    if (!acc[key] || typeof acc[key] !== 'object') {
      acc[key] = {};
    }
    return acc[key];
  }, obj);
  target[lastKey] = value;
  return obj;
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

export function validateForm(formData, validationRules) {
  const errors = {};
  let hasErrors = false;

  for (const [field, rules] of Object.entries(validationRules)) {
    const value = field.includes('.') ? getNestedValue(formData, field) : formData[field];
    const error = validateField(value, rules);
    if (error) {
      errors[field] = error;
      hasErrors = true;
    }
  }

  return { errors, isValid: !hasErrors };
}

export function useFormValidation(initialState = {}, validationRules = {}) {
  const [values, setValues] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const handleChange = (name, value) => {
    setValues(prev => {
      const newValues = JSON.parse(JSON.stringify(prev));
      if (name.includes('.')) {
        setNestedValue(newValues, name, value);
      } else {
        newValues[name] = value;
      }
      return newValues;
    });
    
    if (touched[name] && validationRules[name]) {
      const error = validateField(value, validationRules[name]);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    
    if (validationRules[name]) {
      const value = name.includes('.') ? getNestedValue(values, name) : values[name];
      const error = validateField(value, validationRules[name]);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const validateAll = () => {
    const { errors: allErrors, isValid } = validateForm(values, validationRules);
    setErrors(allErrors);
    setTouched(
      Object.keys(validationRules).reduce((acc, key) => ({ ...acc, [key]: true }), {})
    );
    return isValid;
  };

  const reset = () => {
    setValues(initialState);
    setErrors({});
    setTouched({});
  };

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    reset,
    setValues
  };
}
