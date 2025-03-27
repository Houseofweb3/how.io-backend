# Use the official Node.js 18 image as the base image
FROM node:18

# Set the working directory inside the container
WORKDIR /app

# Copy the package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Install TypeScript globally
RUN npm install -g typescript

# Build the TypeScript code
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["node", "dist/index.js"]
