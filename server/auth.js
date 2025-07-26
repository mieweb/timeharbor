import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { check } from 'meteor/check';

// Rate limiting for authentication attempts
const authAttempts = new Map();

const RATE_LIMIT = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  lockoutMs: 30 * 60 * 1000  // 30 minutes
};

function checkRateLimit(identifier) {
  const now = Date.now();
  const attempts = authAttempts.get(identifier) || { count: 0, firstAttempt: now, lockedUntil: 0 };
  
  // Check if currently locked out
  if (attempts.lockedUntil > now) {
    const remainingLockout = Math.ceil((attempts.lockedUntil - now) / 1000 / 60);
    throw new Meteor.Error('rate-limited', `Too many failed attempts. Try again in ${remainingLockout} minutes.`);
  }
  
  // Reset if window has passed
  if (now - attempts.firstAttempt > RATE_LIMIT.windowMs) {
    attempts.count = 0;
    attempts.firstAttempt = now;
  }
  
  // Increment attempt count
  attempts.count++;
  
  // Check if should be locked out
  if (attempts.count >= RATE_LIMIT.maxAttempts) {
    attempts.lockedUntil = now + RATE_LIMIT.lockoutMs;
    authAttempts.set(identifier, attempts);
    throw new Meteor.Error('rate-limited', `Too many failed attempts. Try again in ${RATE_LIMIT.lockoutMs / 1000 / 60} minutes.`);
  }
  
  authAttempts.set(identifier, attempts);
  return true;
}

function clearRateLimit(identifier) {
  authAttempts.delete(identifier);
}

// Username validation rules
const USERNAME_RULES = {
  minLength: 3,
  maxLength: 20,
  allowedChars: /^[a-zA-Z0-9_-]+$/,
  reservedWords: ['admin', 'root', 'system', 'user', 'test', 'guest', 'administrator']
};

// Password validation rules
const PASSWORD_RULES = {
  minLength: 8,
  maxLength: 128,
  weakPasswords: ['password', '123456', 'qwerty', 'admin', 'letmein', 'password123', 'admin123']
};

export const AuthMethods = {
  // Validate username
  validateUsername(username) {
    if (!username || username.trim().length === 0) {
      throw new Meteor.Error('invalid-username', 'Username is required');
    }
    
    const trimmedUsername = username.trim();
    
    if (trimmedUsername.length < USERNAME_RULES.minLength) {
      throw new Meteor.Error('invalid-username', `Username must be at least ${USERNAME_RULES.minLength} characters long`);
    }
    
    if (trimmedUsername.length > USERNAME_RULES.maxLength) {
      throw new Meteor.Error('invalid-username', `Username must be no more than ${USERNAME_RULES.maxLength} characters long`);
    }
    
    if (!USERNAME_RULES.allowedChars.test(trimmedUsername)) {
      throw new Meteor.Error('invalid-username', 'Username can only contain letters, numbers, underscores, and hyphens');
    }
    
    if (USERNAME_RULES.reservedWords.includes(trimmedUsername.toLowerCase())) {
      throw new Meteor.Error('invalid-username', 'This username is not allowed');
    }
    
    return trimmedUsername;
  },
  
  // Validate password
  validatePassword(password) {
    if (!password || password.length === 0) {
      throw new Meteor.Error('invalid-password', 'Password is required');
    }
    
    if (password.length < PASSWORD_RULES.minLength) {
      throw new Meteor.Error('invalid-password', `Password must be at least ${PASSWORD_RULES.minLength} characters long`);
    }
    
    if (password.length > PASSWORD_RULES.maxLength) {
      throw new Meteor.Error('invalid-password', `Password must be no more than ${PASSWORD_RULES.maxLength} characters long`);
    }
    
    // Enforce complexity requirements
    if (!/[A-Z]/.test(password)) {
      throw new Meteor.Error('invalid-password', 'Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      throw new Meteor.Error('invalid-password', 'Password must contain at least one lowercase letter');
    }
    if (!/\d/.test(password)) {
      throw new Meteor.Error('invalid-password', 'Password must contain at least one digit');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      throw new Meteor.Error('invalid-password', 'Password must contain at least one special character');
    }
    // Check for weak passwords
    if (PASSWORD_RULES.weakPasswords.includes(password.toLowerCase())) {
      throw new Meteor.Error('invalid-password', 'This password is too common. Please choose a stronger password');
    }
    
    return password;
  },
  
  // Check username availability
  async checkUsernameAvailability(username) {
    check(username, String);
    
    try {
      const validatedUsername = this.validateUsername(username);
      
      // Check if username already exists
      const existingUser = await Meteor.users.findOneAsync({ username: validatedUsername });
      
      return {
        available: !existingUser,
        message: existingUser ? 'Username is already taken' : 'Username is available'
      };
    } catch (error) {
      return {
        available: false,
        message: error.reason || 'Invalid username'
      };
    }
  },
  
  // Check email availability
  async checkEmailAvailability(email) {
    check(email, String);
    
    try {
      const validatedEmail = email.trim();
      
      // Basic email validation
      if (!validatedEmail.includes('@') || !validatedEmail.includes('.')) {
        return {
          available: false,
          message: 'Please enter a valid email address'
        };
      }
      
      // Check if email already exists (case-insensitive)
      const existingUser = await Meteor.users.findOneAsync({ 
        'emails.address': { $regex: new RegExp(`^${validatedEmail}$`, 'i') }
      });
      
      return {
        available: !existingUser,
        message: existingUser ? 'Email address is already registered' : 'Email is available'
      };
    } catch (error) {
      return {
        available: false,
        message: 'Error checking email availability'
      };
    }
  },
  
  // Create user account with validation
  async createUserAccount({ username, email, password, confirmPassword }) {
    check(username, String);
    check(email, String);
    check(password, String);
    check(confirmPassword, String);
    
    try {
      // Basic validation
      if (!username || username.trim().length < 3) {
        throw new Meteor.Error('invalid-username', 'Username must be at least 3 characters long');
      }
      
      if (password !== confirmPassword) {
        throw new Meteor.Error('password-mismatch', 'Passwords do not match');
      }
      
      const validatedUsername = username.trim();
      const validatedEmail = email.trim();
      
      // Server-side email validation for additional security
      if (!validatedEmail.includes('@') || !validatedEmail.includes('.')) {
        throw new Meteor.Error('invalid-email', 'Please enter a valid email address');
      }
      
      const domain = validatedEmail.split('@')[1];
      const validEndings = [
        '.com', '.org', '.net', '.edu', '.gov', '.mil', 
        '.co', '.io', '.ai', '.app', '.dev', '.tech',
        '.info', '.biz', '.me', '.tv', '.cc', '.ws'
      ];
      
      const hasValidEnding = validEndings.some(ending => domain.endsWith(ending));
      if (!hasValidEnding) {
        throw new Meteor.Error('invalid-email', 'Please use a valid email address with a recognized domain ending (.com, .org, .edu, etc.)');
      }
      
      // Check if username already exists
      const existingUser = await Meteor.users.findOneAsync({ username: validatedUsername });
      if (existingUser) {
        throw new Meteor.Error('username-taken', 'Username is already taken');
      }
      
      // Check if email already exists (case-insensitive)
      const existingEmail = await Meteor.users.findOneAsync({ 
        'emails.address': { $regex: new RegExp(`^${validatedEmail}$`, 'i') }
      });
      if (existingEmail) {
        throw new Meteor.Error('email-taken', 'Email address is already registered');
      }
      
      // Create the user using Meteor's built-in Accounts.createUser()
      // Meteor will handle email validation, password hashing, and user creation
      const userId = Accounts.createUser({ 
        username: validatedUsername,
        email: validatedEmail,
        password: password 
      });
      
      console.log('User created successfully:', { userId, username: validatedUsername });
      
      // Verify the user was actually created
      const createdUser = await Meteor.users.findOneAsync(userId);
      console.log('Created user verification:', createdUser ? 'User found in database' : 'User NOT found in database');
      
      if (createdUser) {
        console.log('User details:', {
          id: createdUser._id,
          username: createdUser.username,
          hasServices: !!createdUser.services,
          hasPassword: !!createdUser.services?.password
        });
      }
      
      return { userId, username: validatedUsername, email: validatedEmail };
      
    } catch (error) {
      console.error('Error creating user account:', error);
      
      // Re-throw the error
      throw error;
    }
  },
  
  // Login with rate limiting
  async loginUser({ email, password }) {
    check(email, String);
    check(password, String);
    
    // Rate limiting
    checkRateLimit(`login:${email}`);
    
    try {
      // Find the user by email (case-insensitive)
      const user = await Meteor.users.findOneAsync({ 
        'emails.address': { $regex: new RegExp(`^${email}$`, 'i') }
      });
      if (!user) {
        throw new Meteor.Error('login-failed', 'Invalid email or password');
      }
      
      // Verify password using Accounts._checkPassword
      const passwordCheck = await Accounts._checkPassword(user, password);
      if (passwordCheck.error) {
        throw new Meteor.Error('login-failed', 'Invalid email or password');
      }
      
      // Clear rate limit on successful validation
      clearRateLimit(`login:${email}`);
      
      console.log('User login validated successfully:', { email });
      return { success: true, userId: user._id };
      
    } catch (error) {
      console.error('Login error:', error);
      
      // Re-throw our custom errors
      if (error.error === 'login-failed') {
        throw error;
      }
      
      throw new Meteor.Error('login-failed', 'Login failed. Please try again.');
    }
  },
  
  // Forgot password functionality
  async requestPasswordReset(email) {
    check(email, String);
    
    // Rate limiting for password reset requests
    checkRateLimit(`reset:${email}`);
    
    try {
      // Find user by email (case-insensitive)
      const user = await Meteor.users.findOneAsync({ 
        'emails.address': { $regex: new RegExp(`^${email}$`, 'i') }
      });
      
      if (!user) {
        // Don't reveal if user exists or not for security
        return { success: true, message: 'If an account exists with this email, you will receive a reset link.' };
      }
      
      // Generate reset token
      const token = Accounts._generateStampedLoginToken();
      
      // Store reset token (you might want to add this to user document)
      await Meteor.users.updateAsync(user._id, {
        $set: {
          'services.password.reset': {
            token: token.token,
            when: new Date(),
            email: email
          }
        }
      });
      
      // Clear rate limit
      clearRateLimit(`reset:${email}`);
      
      // In a real app, you would send an email here
      console.log('Password reset token generated for:', email, 'Token:', token.token);
      
      return { 
        success: true, 
        message: 'If an account exists with this email, you will receive a reset link.',
        token: token.token // Remove this in production, just for testing
      };
      
    } catch (error) {
      console.error('Password reset request error:', error);
      throw new Meteor.Error('reset-failed', 'Failed to process password reset request');
    }
  }
}; 