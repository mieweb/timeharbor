// Authentication validation utilities
export const AuthValidation = {
  // Username validation rules
  username: {
    minLength: 3,
    maxLength: 20,
    allowedChars: /^[a-zA-Z0-9_-]+$/,
    
    validate(username) {
      const errors = [];
      
      if (!username || username.trim().length === 0) {
        errors.push('Username is required');
        return { isValid: false, errors };
      }
      
      const trimmedUsername = username.trim();
      
      if (trimmedUsername.length < this.minLength) {
        errors.push(`Username must be at least ${this.minLength} characters long`);
      }
      
      if (trimmedUsername.length > this.maxLength) {
        errors.push(`Username must be no more than ${this.maxLength} characters long`);
      }
      
      if (!this.allowedChars.test(trimmedUsername)) {
        errors.push('Username can only contain letters, numbers, underscores, and hyphens');
      }
      
      // Check for common reserved words
      const reservedWords = ['admin', 'root', 'system', 'user', 'test', 'guest'];
      if (reservedWords.includes(trimmedUsername.toLowerCase())) {
        errors.push('This username is not allowed');
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        value: trimmedUsername
      };
    }
  },
  
  // Password validation rules
  password: {
    minLength: 8,
    maxLength: 128,
    
    validate(password) {
      const errors = [];
      
      if (!password || password.length === 0) {
        errors.push('Password is required');
        return { isValid: false, errors };
      }
      
      if (password.length < this.minLength) {
        errors.push(`Password must be at least ${this.minLength} characters long`);
      }
      
      if (password.length > this.maxLength) {
        errors.push(`Password must be no more than ${this.maxLength} characters long`);
      }
      
      // Enforce complexity requirements
      if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
      }
      if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
      }
      if (!/\d/.test(password)) {
        errors.push('Password must contain at least one digit');
      }
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one special character');
      }
      // Check for common weak passwords
      const weakPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
      if (weakPasswords.includes(password.toLowerCase())) {
        errors.push('This password is too common. Please choose a stronger password');
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        strength: this.calculateStrength(password)
      };
    },
    
    calculateStrength(password) {
      let score = 0;
      
      // Length contribution
      if (password.length >= 8) score += 1;
      if (password.length >= 12) score += 1;
      if (password.length >= 16) score += 1;
      
      // Character variety contribution
      if (/[A-Z]/.test(password)) score += 1;
      if (/[a-z]/.test(password)) score += 1;
      if (/\d/.test(password)) score += 1;
      if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;
      
      // Determine strength level
      if (score <= 2) return 'weak';
      if (score <= 4) return 'medium';
      if (score <= 6) return 'strong';
      return 'very-strong';
    }
  },
  
  // Confirm password validation
  confirmPassword: {
    validate(password, confirmPassword) {
      if (!confirmPassword) {
        return { isValid: false, errors: ['Please confirm your password'] };
      }
      
      if (password !== confirmPassword) {
        return { isValid: false, errors: ['Passwords do not match'] };
      }
      
      return { isValid: true, errors: [] };
    }
  }
}; 