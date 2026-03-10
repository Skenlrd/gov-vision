**CLIENT SIDE LIBRARIES**
cd client
npm create vite@latest client
Creates a new React project using Vite with a fast development server and modern build tooling.

npm install axios
Installs Axios to send HTTP requests from the React frontend to backend APIs.

npm install react-router-dom
Adds routing support to navigate between different pages inside the React application.

npm install recharts
Installs a React chart library used to build basic analytics charts like bar charts, line charts, and pie charts.

npm install echarts
Installs Apache ECharts used for advanced visualizations such as heatmaps, radar charts, and forecasting graphs.

npm install clsx
Provides a utility to conditionally combine CSS class names for cleaner dynamic styling.

npm install -D tailwindcss
Installs TailwindCSS for utility-first styling of dashboards and UI components.

npm install -D postcss
Installs PostCSS which processes CSS and allows TailwindCSS plugins to work.

npm install -D autoprefixer
Automatically adds browser compatibility prefixes to CSS.

npm install -D @types/node
Provides TypeScript type definitions for Node.js APIs during development.

**SERVER SIDE LIBRARIES**
npm install express
npm install mongoose
npm install redis
npm install node-cron
npm install axios
npm install jsonwebtoken
npm install dotenv

**SERVER SIDE MODELS**
server/models/KpiSnapshot.ts
server/models/Anomaly.ts
server/models/Forecast.ts
server/models/Report.ts
server/models/ReportSchedule.ts

**ML DEPENDENCIES**
pip install fastapi
pip install uvicorn
pip install scikit-learn
pip install pandas
pip install numpy
pip install joblib