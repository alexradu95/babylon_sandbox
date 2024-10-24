import { defineConfig } from 'vite';
import mkcert from'vite-plugin-mkcert'

export default defineConfig(({ command, mode }) => {
    return {
        resolve: {
            alias: {
                'babylonjs': mode === 'development' ? 'babylonjs/babylon.max' : 'babylonjs'
            }
        },
        plugins: [mkcert()]
    };
});
