import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { AuthValidation } from './authValidation.js';

// Import templates
import './authTemplates.html';

// Global reactive variables for authentication state
const authState = {
  currentScreen: new ReactiveVar('authPage'),
  isLoginActive: new ReactiveVar(true),
  isSignupActive: new ReactiveVar(false),
  showForgotPassword: new ReactiveVar(false)
};

// Authentication template logic
Template.authPage.onCreated(function() {
  this.autorun(() => {
    if (Meteor.userId()) {
      authState.currentScreen.set('mainLayout');
    } else {
      authState.currentScreen.set('authPage');
    }
  });
});

Template.authPage.helpers({
  isLoginActive() {
    return authState.isLoginActive.get();
  },
  isSignupActive() {
    return authState.isSignupActive.get();
  }
});

Template.authPage.events({
  'click #login'(event) {
    event.preventDefault();
    authState.isLoginActive.set(true);
    authState.isSignupActive.set(false);
  },
  'click #signup'(event) {
    event.preventDefault();
    authState.isSignupActive.set(true);
    authState.isLoginActive.set(false);
  }
});

// Login form logic
Template.loginForm.onCreated(function() {
  this.loginError = new ReactiveVar('');
  this.isLoginLoading = new ReactiveVar(false);
  this.loginEmailError = new ReactiveVar('');
  this.loginPasswordError = new ReactiveVar('');
});

Template.loginForm.helpers({
  loginError() {
    return Template.instance().loginError.get();
  },
  isLoginLoading() {
    return Template.instance().isLoginLoading.get();
  },
  loginEmailError() {
    return Template.instance().loginEmailError.get();
  },
  loginPasswordError() {
    return Template.instance().loginPasswordError.get();
  },
  loginButtonClass() {
    const isLoading = Template.instance().isLoginLoading.get();
    return `w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`;
  },
  loginButtonDisabled() {
    const isLoading = Template.instance().isLoginLoading.get();
    return isLoading ? 'disabled' : '';
  },
  loginEmailClass() {
    const hasError = Template.instance().loginEmailError.get();
    const borderClass = hasError ? 'border-red-500' : 'border-gray-300';
    return `w-full px-3 py-2 border ${borderClass} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`;
  },
  loginPasswordClass() {
    const hasError = Template.instance().loginPasswordError.get();
    const borderClass = hasError ? 'border-red-500' : 'border-gray-300';
    return `w-full px-3 py-2 border ${borderClass} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`;
  }
});

Template.loginForm.events({
  'submit #loginForm'(event, template) {
    event.preventDefault();
    
    // Clear previous errors
    template.loginError.set('');
    template.loginEmailError.set('');
    template.loginPasswordError.set('');
    
    const email = event.target.email.value.trim();
    const password = event.target.password.value;
    
    // Validate inputs
    if (!email) {
      template.loginEmailError.set('Email is required');
      return;
    }
    if (!password) {
      template.loginPasswordError.set('Password is required');
      return;
    }
    
    template.isLoginLoading.set(true);
    
    Meteor.loginWithPassword(email, password, (err) => {
      template.isLoginLoading.set(false);
      if (err) {
        console.error('Login error:', err);
        template.loginError.set(err.reason || 'Login failed. Please try again.');
      } else {
        console.log('Login successful');
      }
    });
  },
  
  'click #googleLoginBtn'(event, template) {
    event.preventDefault();
    template.loginError.set('');
    template.isLoginLoading.set(true);
    
    // Custom Google OAuth implementation
    const googleAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' +
      'client_id=' + encodeURIComponent(Meteor.settings?.public?.google?.clientId || 'YOUR_ACTUAL_CLIENT_ID_HERE') +
      '&redirect_uri=' + encodeURIComponent(window.location.origin + '/_oauth/google') +
      '&scope=' + encodeURIComponent('email profile') +
      '&response_type=code' +
      '&access_type=offline';
    
    // Open Google OAuth popup
    const popup = window.open(googleAuthUrl, 'googleOAuth', 'width=500,height=600,scrollbars=yes,resizable=yes');
    
    // Handle the OAuth response
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        template.isLoginLoading.set(false);
        // Handle popup closed without completion
        template.loginError.set('Google login was cancelled');
      }
    }, 1000);
    
    // Listen for OAuth response
    window.addEventListener('message', (event) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'GOOGLE_OAUTH_SUCCESS') {
        clearInterval(checkClosed);
        popup.close();
        template.isLoginLoading.set(false);
        console.log('Google OAuth successful');
        
        // Log in the user using the token
        if (event.data.user && event.data.user.token) {
          Meteor.loginWithToken(event.data.user.token, (err) => {
            if (err) {
              console.error('Token login error:', err);
              template.loginError.set('Login failed. Please try again.');
            } else {
              console.log('User logged in successfully');
              // The autorun in authPage will handle the redirect to main page
            }
          });
        }
        
      } else if (event.data.type === 'GOOGLE_OAUTH_ERROR') {
        clearInterval(checkClosed);
        popup.close();
        template.isLoginLoading.set(false);
        template.loginError.set(event.data.error || 'Google login failed');
      }
    });
  },
  
  'click #forgotPasswordBtn'(event) {
    event.preventDefault();
    authState.showForgotPassword.set(true);
  }
});

// Signup form logic
Template.signupForm.onCreated(function() {
  this.signupError = new ReactiveVar('');
  this.isSignupLoading = new ReactiveVar(false);
  this.signupUsernameError = new ReactiveVar('');
  this.signupEmailError = new ReactiveVar('');
  this.signupPasswordError = new ReactiveVar('');
  this.confirmPasswordError = new ReactiveVar('');
  this.signupUsernameValid = new ReactiveVar(false);
  this.signupEmailValid = new ReactiveVar(false);
  this.signupPasswordValid = new ReactiveVar(false);
  this.confirmPasswordValid = new ReactiveVar(false);
  this.passwordStrength = new ReactiveVar(null);
  this.usernameValidationTimeout = null;
  this.emailValidationTimeout = null;
  this.passwordValidationTimeout = null;
});

Template.signupForm.helpers({
  signupError() {
    return Template.instance().signupError.get();
  },
  isSignupLoading() {
    return Template.instance().isSignupLoading.get();
  },
  signupUsernameError() {
    return Template.instance().signupUsernameError.get();
  },
  signupEmailError() {
    return Template.instance().signupEmailError.get();
  },
  signupPasswordError() {
    return Template.instance().signupPasswordError.get();
  },
  confirmPasswordError() {
    return Template.instance().confirmPasswordError.get();
  },
  signupUsernameValid() {
    return Template.instance().signupUsernameValid.get();
  },
  signupEmailValid() {
    return Template.instance().signupEmailValid.get();
  },
  signupPasswordValid() {
    return Template.instance().signupPasswordValid.get();
  },
  confirmPasswordValid() {
    return Template.instance().confirmPasswordValid.get();
  },
  passwordStrength() {
    return Template.instance().passwordStrength.get();
  },
  passwordStrengthBars() {
    const strength = Template.instance().passwordStrength.get();
    if (!strength) return [];
    
    const bars = [];
    const colors = {
      'weak': 'bg-red-500',
      'medium': 'bg-yellow-500',
      'strong': 'bg-blue-500',
      'very-strong': 'bg-green-500'
    };
    
    const barCount = {
      'weak': 1,
      'medium': 2,
      'strong': 3,
      'very-strong': 4
    };
    
    for (let i = 0; i < 4; i++) {
      bars.push({
        color: i < barCount[strength] ? colors[strength] : 'bg-gray-200'
      });
    }
    
    return bars;
  },
  passwordStrengthColorClass() {
    const strength = Template.instance().passwordStrength.get();
    const colors = {
      'weak': 'text-red-600',
      'medium': 'text-yellow-600',
      'strong': 'text-blue-600',
      'very-strong': 'text-green-600'
    };
    return colors[strength] || 'text-gray-600';
  },
  passwordStrengthText() {
    const strength = Template.instance().passwordStrength.get();
    const texts = {
      'weak': 'Weak',
      'medium': 'Medium',
      'strong': 'Strong',
      'very-strong': 'Very Strong'
    };
    return texts[strength] || '';
  },
  hasMinLength() {
    const password = document.querySelector('#signupPassword')?.value || '';
    return password.length >= 8;
  },
  hasUpperCase() {
    const password = document.querySelector('#signupPassword')?.value || '';
    return /[A-Z]/.test(password);
  },
  hasLowerCase() {
    const password = document.querySelector('#signupPassword')?.value || '';
    return /[a-z]/.test(password);
  },
  hasNumber() {
    const password = document.querySelector('#signupPassword')?.value || '';
    return /\d/.test(password);
  },
  hasSpecialChar() {
    const password = document.querySelector('#signupPassword')?.value || '';
    return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  },
  minLengthClass() {
    const password = document.querySelector('#signupPassword')?.value || '';
    return password.length >= 8 ? 'text-green-600' : 'text-gray-400';
  },
  upperCaseClass() {
    const password = document.querySelector('#signupPassword')?.value || '';
    return /[A-Z]/.test(password) ? 'text-green-600' : 'text-gray-400';
  },
  lowerCaseClass() {
    const password = document.querySelector('#signupPassword')?.value || '';
    return /[a-z]/.test(password) ? 'text-green-600' : 'text-gray-400';
  },
  numberClass() {
    const password = document.querySelector('#signupPassword')?.value || '';
    return /\d/.test(password) ? 'text-green-600' : 'text-gray-400';
  },
  specialCharClass() {
    const password = document.querySelector('#signupPassword')?.value || '';
    return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? 'text-green-600' : 'text-gray-400';
  },
  anyCharClass() {
    const password = document.querySelector('#signupPassword')?.value || '';
    const hasAnyChar = /[A-Za-z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    return hasAnyChar ? 'text-green-600' : 'text-gray-400';
  },
  isFormValid() {
    const template = Template.instance();
    return template.signupUsernameValid.get() && 
           template.signupEmailValid.get() &&
           template.signupPasswordValid.get() && 
           template.confirmPasswordValid.get();
  },
  signupUsernameClass() {
    const template = Template.instance();
    const hasError = template.signupUsernameError.get();
    const isValid = template.signupUsernameValid.get();
    let borderClass = 'border-gray-300';
    if (hasError) borderClass = 'border-red-500';
    else if (isValid) borderClass = 'border-green-500';
    return `w-full px-3 py-2 border ${borderClass} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`;
  },
  signupEmailClass() {
    const template = Template.instance();
    const hasError = template.signupEmailError.get();
    const isValid = template.signupEmailValid.get();
    let borderClass = 'border-gray-300';
    if (hasError) borderClass = 'border-red-500';
    else if (isValid) borderClass = 'border-green-500';
    return `w-full px-3 py-2 border ${borderClass} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`;
  },
  signupPasswordClass() {
    const template = Template.instance();
    const hasError = template.signupPasswordError.get();
    const isValid = template.signupPasswordValid.get();
    let borderClass = 'border-gray-300';
    if (hasError) borderClass = 'border-red-500';
    else if (isValid) borderClass = 'border-green-500';
    return `w-full px-3 py-2 border ${borderClass} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`;
  },
  confirmPasswordClass() {
    const template = Template.instance();
    const hasError = template.confirmPasswordError.get();
    const isValid = template.confirmPasswordValid.get();
    let borderClass = 'border-gray-300';
    if (hasError) borderClass = 'border-red-500';
    else if (isValid) borderClass = 'border-green-500';
    return `w-full px-3 py-2 border ${borderClass} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`;
  },
  signupButtonClass() {
    const template = Template.instance();
    const isLoading = template.isSignupLoading.get();
    const isValid = template.signupUsernameValid.get() && 
                   template.signupEmailValid.get() &&
                   template.signupPasswordValid.get() && 
                   template.confirmPasswordValid.get();
    const disabledClass = (isLoading || !isValid) ? 'opacity-50 cursor-not-allowed' : '';
    return `w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors ${disabledClass}`;
  },
  signupButtonDisabled() {
    const template = Template.instance();
    const isLoading = template.isSignupLoading.get();
    const isValid = template.signupUsernameValid.get() && 
                   template.signupEmailValid.get() &&
                   template.signupPasswordValid.get() && 
                   template.confirmPasswordValid.get();
    return (isLoading || !isValid) ? 'disabled' : '';
  }
});

Template.signupForm.events({
  'input #signupUsername'(event, template) {
    const username = event.target.value.trim();
    
    // Clear validation if empty
    if (!username) {
      template.signupUsernameError.set('');
      template.signupUsernameValid.set(false);
      return;
    }
    
    // Client-side validation first
    const validation = AuthValidation.username.validate(username);
    if (!validation.isValid) {
      template.signupUsernameError.set(validation.errors[0]);
      template.signupUsernameValid.set(false);
      return;
    }
    
    // Clear client-side error
    template.signupUsernameError.set('');
    
    // Debounce server-side validation
    clearTimeout(template.usernameValidationTimeout);
    template.usernameValidationTimeout = setTimeout(() => {
      Meteor.call('checkUsernameAvailability', username, (err, result) => {
        if (!err && result.available) {
          template.signupUsernameValid.set(true);
        } else {
          template.signupUsernameError.set(result?.message || 'Username validation failed');
          template.signupUsernameValid.set(false);
        }
      });
    }, 300);
  },
  
  'input #signupEmail'(event, template) {
    const email = event.target.value.trim();
    
    // Clear validation if empty
    if (!email) {
      template.signupEmailError.set('');
      template.signupEmailValid.set(false);
      return;
    }
    
    // Client-side validation for better user experience
    // Check basic format first
    if (!email.includes('@') || !email.includes('.')) {
      template.signupEmailError.set('Please enter a valid email address');
      template.signupEmailValid.set(false);
      return;
    }
    
    // Check for realistic domain endings
    const domain = email.split('@')[1];
    const validEndings = [
      '.com', '.org', '.net', '.edu', '.gov', '.mil', 
      '.co', '.io', '.ai', '.app', '.dev', '.tech',
      '.info', '.biz', '.me', '.tv', '.cc', '.ws'
    ];
    
    const hasValidEnding = validEndings.some(ending => domain.endsWith(ending));
    if (!hasValidEnding) {
      template.signupEmailError.set('Please use a valid email address with a recognized domain ending (.com, .org, .edu, etc.)');
      template.signupEmailValid.set(false);
      return;
    }
    
    // Additional basic checks
    const localPart = email.split('@')[0];
    if (localPart.length < 2) {
      template.signupEmailError.set('Email username should be at least 2 characters');
      template.signupEmailValid.set(false);
      return;
    }
    
    if (domain.length < 4) {
      template.signupEmailError.set('Please enter a valid email address');
      template.signupEmailValid.set(false);
      return;
    }
    
    // Clear client-side error
    template.signupEmailError.set('');
    
    // Debounce server-side email availability check
    clearTimeout(template.emailValidationTimeout);
    template.emailValidationTimeout = setTimeout(() => {
      Meteor.call('checkEmailAvailability', email, (err, result) => {
        if (!err && result.available) {
          template.signupEmailValid.set(true);
        } else {
          template.signupEmailError.set(result?.message || 'Email validation failed');
          template.signupEmailValid.set(false);
        }
      });
    }, 300);
  },
  
  'input #signupPassword'(event, template) {
    const password = event.target.value;
    
    // Clear validation if empty
    if (!password) {
      template.signupPasswordError.set('');
      template.signupPasswordValid.set(false);
      template.passwordStrength.set(null);
      return;
    }
    
    // Full validation using AuthValidation
    const validation = AuthValidation.password.validate(password);
    if (!validation.isValid) {
      template.signupPasswordError.set(validation.errors[0]);
      template.signupPasswordValid.set(false);
    } else {
      template.signupPasswordError.set('');
      template.signupPasswordValid.set(true);
    }
    
    // Set password strength (simplified)
    const strength = password.length >= 12 ? 'strong' : password.length >= 8 ? 'medium' : 'weak';
    template.passwordStrength.set(strength);
    
    // Check confirm password if it exists
    const confirmPassword = document.querySelector('#confirmPassword')?.value || '';
    if (confirmPassword) {
      if (password !== confirmPassword) {
        template.confirmPasswordError.set('Passwords do not match');
        template.confirmPasswordValid.set(false);
      } else {
        template.confirmPasswordError.set('');
        template.confirmPasswordValid.set(true);
      }
    }
  },
  
  'input #confirmPassword'(event, template) {
    const password = document.querySelector('#signupPassword')?.value || '';
    const confirmPassword = event.target.value;
    
    if (!confirmPassword) {
      template.confirmPasswordError.set('');
      template.confirmPasswordValid.set(false);
      return;
    }
    
    const validation = AuthValidation.confirmPassword.validate(password, confirmPassword);
    template.confirmPasswordError.set(validation.errors[0] || '');
    template.confirmPasswordValid.set(validation.isValid);
  },
  
  'submit #signupForm'(event, template) {
    event.preventDefault();
    
    // Clear previous errors
    template.signupError.set('');
    
    const username = event.target.username.value.trim();
    const email = event.target.email.value.trim();
    const password = event.target.password.value;
    const confirmPassword = event.target.confirmPassword.value;
    
    // Final validation
    if (!template.signupUsernameValid.get()) {
      template.signupError.set('Please fix username errors');
      return;
    }
    
    if (!template.signupEmailValid.get()) {
      template.signupError.set('Please fix email errors');
      return;
    }
    
    if (!template.signupPasswordValid.get()) {
      template.signupError.set('Please fix password errors');
      return;
    }
    
    if (!template.confirmPasswordValid.get()) {
      template.signupError.set('Please fix confirm password errors');
      return;
    }
    
    // Set loading state
    template.isSignupLoading.set(true);
    
    // Call server method
    Meteor.call('createUserAccount', { username, email, password, confirmPassword }, (err, result) => {
      if (err) {
        template.isSignupLoading.set(false);
        console.error('Signup error:', err);
        template.signupError.set(err.reason || 'Failed to create account. Please try again.');
      } else {
        console.log('Account created successfully, now logging in...');
        
        // Auto-login the user after successful account creation
        // Try immediate login first
        Meteor.loginWithPassword(username, password, (loginErr) => {
          if (loginErr) {
            console.error('Immediate auto-login failed:', loginErr);
            console.error('Auto-login error details:', {
              reason: loginErr.reason,
              error: loginErr.error,
              details: loginErr.details
            });
            
            // If immediate login fails, try again after a short delay
            setTimeout(() => {
              Meteor.loginWithPassword(username, password, (retryErr) => {
                template.isSignupLoading.set(false);
                
                if (retryErr) {
                  console.error('Retry auto-login also failed:', retryErr);
                  template.signupError.set('Account created but login failed. Please try logging in manually.');
                } else {
                  console.log('Retry auto-login successful');
                  // The autorun in authPage will handle the redirect
                }
              });
            }, 2000); // Wait 2 seconds before retry
          } else {
            template.isSignupLoading.set(false);
            console.log('Immediate auto-login successful');
            // The autorun in authPage will handle the redirect
          }
        });
      }
    });
  },
  
  'click #googleSignupBtn'(event, template) {
    event.preventDefault();
    template.signupError.set('');
    template.isSignupLoading.set(true);
    
    // Custom Google OAuth implementation
    const googleAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' +
      'client_id=' + encodeURIComponent(Meteor.settings?.public?.google?.clientId || 'YOUR_ACTUAL_CLIENT_ID_HERE') +
      '&redirect_uri=' + encodeURIComponent(window.location.origin + '/_oauth/google') +
      '&scope=' + encodeURIComponent('email profile') +
      '&response_type=code' +
      '&access_type=offline';
    
    // Open Google OAuth popup
    const popup = window.open(googleAuthUrl, 'googleOAuth', 'width=500,height=600,scrollbars=yes,resizable=yes');
    
    // Handle the OAuth response
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        template.isSignupLoading.set(false);
        // Handle popup closed without completion
        template.signupError.set('Google signup was cancelled');
      }
    }, 1000);
    
    // Listen for OAuth response
    window.addEventListener('message', (event) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'GOOGLE_OAUTH_SUCCESS') {
        clearInterval(checkClosed);
        popup.close();
        template.isSignupLoading.set(false);
        console.log('Google OAuth successful');
        
        // Log in the user using the token
        if (event.data.user && event.data.user.token) {
          Meteor.loginWithToken(event.data.user.token, (err) => {
            if (err) {
              console.error('Token login error:', err);
              template.signupError.set('Signup failed. Please try again.');
            } else {
              console.log('User signed up and logged in successfully');
              // The autorun in authPage will handle the redirect to main page
            }
          });
        }
        
      } else if (event.data.type === 'GOOGLE_OAUTH_ERROR') {
        clearInterval(checkClosed);
        popup.close();
        template.isSignupLoading.set(false);
        template.signupError.set(event.data.error || 'Google signup failed');
      }
    });
  }
});

// Forgot password modal logic
Template.forgotPasswordModal.onCreated(function() {
  this.resetError = new ReactiveVar('');
  this.resetSuccess = new ReactiveVar('');
  this.resetToken = new ReactiveVar('');
  this.isResetLoading = new ReactiveVar(false);
});

Template.forgotPasswordModal.helpers({
  resetError() {
    return Template.instance().resetError.get();
  },
  resetSuccess() {
    return Template.instance().resetSuccess.get();
  },
  resetToken() {
    return Template.instance().resetToken.get();
  },
  isResetLoading() {
    return Template.instance().isResetLoading.get();
  },
  resetButtonClass() {
    const isLoading = Template.instance().isResetLoading.get();
    return `flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`;
  },
  resetButtonDisabled() {
    const isLoading = Template.instance().isResetLoading.get();
    return isLoading ? 'disabled' : '';
  }
});

Template.forgotPasswordModal.events({
  'submit #forgotPasswordForm'(event, template) {
    event.preventDefault();
    
    // Clear previous messages
    template.resetError.set('');
    template.resetSuccess.set('');
    template.resetToken.set('');
    
    const email = event.target.email.value.trim();
    
    if (!email) {
      template.resetError.set('Please enter your email or username');
      return;
    }
    
    // Set loading state
    template.isResetLoading.set(true);
    
    // Call server method
    Meteor.call('requestPasswordReset', email, (err, result) => {
      template.isResetLoading.set(false);
      
      if (err) {
        console.error('Password reset error:', err);
        template.resetError.set(err.reason || 'Failed to process request. Please try again.');
      } else {
        template.resetSuccess.set(result.message);
        if (result.token) {
          template.resetToken.set(result.token);
        }
        // Clear form
        event.target.email.value = '';
      }
    });
  },
  
  'click #closeForgotPassword, click #cancelForgotPassword'(event) {
    event.preventDefault();
    authState.showForgotPassword.set(false);
  }
});

// Body template helpers are now handled in main.js

// Export for use in main.js
export { authState }; 