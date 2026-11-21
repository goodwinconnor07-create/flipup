Pod::Spec.new do |s|
  s.name           = 'FlipupHaptics'
  s.version        = '1.0.0'
  s.summary        = 'Plays FlipUp haptic patterns through Core Haptics'
  s.author         = 'FlipUp'
  s.homepage       = 'https://flipup.app'
  s.license        = 'UNLICENSED'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files   = '**/*.swift'
end
