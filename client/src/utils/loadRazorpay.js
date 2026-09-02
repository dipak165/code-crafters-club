// Loads the Razorpay Checkout script once and caches the promise, so
// multiple "Pay now" clicks don't inject the script tag repeatedly.
let loadPromise = null;

export function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve(true);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error('Could not load the payment gateway. Check your connection and try again.'));
    document.body.appendChild(script);
  });

  return loadPromise;
}
