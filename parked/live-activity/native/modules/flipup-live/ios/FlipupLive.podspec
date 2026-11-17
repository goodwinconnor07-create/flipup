Pod::Spec.new do |s|
  s.name           = 'FlipupLive'
  s.version        = '1.0.0'
  s.summary        = 'Starts and ends FlipUp table Live Activities and reports their push tokens'
  s.author         = 'FlipUp'
  s.homepage       = 'https://playflipup.com'
  s.license        = 'UNLICENSED'
  s.platforms      = { :ios => '16.2' }
  s.source         = { git: '' }
  s.static_framework = true
  s.swift_version  = '5.9'
  s.dependency 'ExpoModulesCore'
  s.frameworks     = 'ActivityKit'
  s.source_files   = '**/*.swift'
end
