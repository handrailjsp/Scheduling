#!/bin/bash

# ============================================
# Database Reset Script
# ============================================
# This script resets the entire database and sets up fresh tables

echo "🔄 Starting database reset..."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with your Supabase credentials:"
    echo "  SUPABASE_URL=your_url"
    echo "  SUPABASE_KEY=your_key"
    exit 1
fi

# Load environment variables
source .env

echo "📋 Database Schema Setup Steps:"
echo ""
echo "1. Go to your Supabase dashboard: https://supabase.com/dashboard"
echo "2. Select your project: ${SUPABASE_URL}"
echo "3. Click 'SQL Editor' in the left sidebar"
echo "4. Click 'New Query'"
echo "5. Copy and paste the contents of 'schema.sql'"
echo "6. Click 'Run' to execute"
echo ""
echo "OR use the Supabase CLI:"
echo "  supabase db reset"
echo ""
echo "📄 Schema file location: $(pwd)/schema.sql"
echo ""
echo "✅ What this will do:"
echo "  - Drop all existing tables (professors, timetable_slots, generated_schedules, etc.)"
echo "  - Create fresh tables with proper constraints"
echo "  - Add 10 sample professors (NBA players)"
echo "  - Add 22 sample timetable slots (mix of AC and non-AC rooms)"
echo "  - Set up indexes for performance"
echo ""
echo "⚠️  WARNING: This will DELETE ALL existing data!"
echo ""
read -p "Have you executed the schema.sql in Supabase? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo ""
    echo "✅ Database reset complete!"
    echo ""
    echo "🚀 Next steps:"
    echo "  1. Restart the backend: python3 main.py"
    echo "  2. Refresh your frontend: http://localhost:3000"
    echo "  3. Generate a schedule in the admin panel"
    echo ""
else
    echo ""
    echo "⏸️  Skipped. Please run the schema.sql manually."
    echo ""
fi
