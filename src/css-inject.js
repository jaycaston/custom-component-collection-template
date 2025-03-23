// Just import CSS, no DOM manipulation
import './retool-component.css';

// Add a small script to show the fallback player if there are errors
setTimeout(() => {
  try {
    const detectErrors = () => {
      // Check for any error elements in our component
      const mainContainer = document.querySelector('.retool-audio-trimmer-root');
      const errorElement = mainContainer?.querySelector('.error-message');
      const loadingElement = mainContainer?.querySelector('.audio-loading');
      
      // If we've been loading for more than 3 seconds or there's an error, show the fallback
      if (errorElement || (loadingElement && document.readyState === 'complete')) {
        const fallbackPlayer = document.getElementById('audio-trimmer-fallback');
        if (fallbackPlayer) {
          fallbackPlayer.style.display = 'block';
          console.log('Audio Trimmer: Showing fallback player due to errors');
        }
      }
    };
    
    // Check after DOM is loaded and again after a delay
    if (document.readyState === 'complete') {
      detectErrors();
    } else {
      window.addEventListener('load', detectErrors);
    }
    
    // Double-check after 3 seconds
    setTimeout(detectErrors, 3000);
  } catch (e) {
    console.error('Error in audio-trimmer fallback script:', e);
  }
}, 500); 