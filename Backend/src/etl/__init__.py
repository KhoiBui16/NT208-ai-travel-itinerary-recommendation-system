"""ETL pipeline for travel data ingestion.

Extract from Goong Maps + OSM Overpass,
Transform (normalize, validate, deduplicate),
Load (upsert to PostgreSQL).
"""
