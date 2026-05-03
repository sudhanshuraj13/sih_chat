/** @type {import('next').NextConfig} */
const nextConfig = {
    serverExternalPackages: ['onnxruntime-node', 'sharp', 'vectra', '@xenova/transformers'],
    devIndicators: {
        buildActivity: false,
        appIsrStatus: false,
    },
};

export default nextConfig;
