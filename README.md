# RPMSpec Changelog

Inserts a properly formatted changelog line to your RPM spec file for you.

## Features

- Uses git name and email in changelog
- Evaluates macros in `Version` and `Release` using `rpmspec`

## Requirements

You should have `git` and `rpmspec` in your PATH.
This is not required, but the changelog will be missing some information.
